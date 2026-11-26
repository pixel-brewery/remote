// #region Imports
import Foundation
import CoreFoundation
// #endregion

/// Foundation-backed bounded stream pair bridges NIO ingress to URLSession without buffering a whole upload.
internal final class RemoteUploadStream: NSObject, StreamDelegate, @unchecked Sendable {
    // Every mutable queue, lifecycle and callback field is protected by this condition.
    // The Foundation output stream and its delegate are confined to the owned writer thread.
    let input: InputStream
    private let _output: OutputStream
    private let _condition = NSCondition()
    private var _chunks: [Data] = []
    private var _offset = 0
    private var _buffered = 0
    private var _ended = false
    private var _closed = false
    private var _started = false
    private var _runLoop: CFRunLoop?
    private var _onCapacity: (@Sendable () -> Void)?
    var onCapacity: (@Sendable () -> Void)? {
        get { _condition.lock(); defer { _condition.unlock() }; return _onCapacity }
        set { _condition.lock(); _onCapacity = newValue; _condition.unlock() }
    }
    override init() {
        var input: InputStream?, output: OutputStream?
        Stream.getBoundStreams(withBufferSize: 65_536, inputStream: &input, outputStream: &output)
        self.input = input!; _output = output!; super.init()
    }
    func start() {
        _condition.lock(); guard !_started else { _condition.unlock(); return }; _started = true; _condition.unlock()
        let thread = Thread { self.writeLoop() }; thread.name = "de.pixelbrewery.remote.upload"; thread.start()
    }
    func push(_ data: Data) throws -> Bool {
        _condition.lock(); defer { _condition.unlock() }
        guard !_closed, !_ended, _buffered + data.count <= 262_144 else { throw RemoteNativeError.invalidRequest }
        if data.isEmpty { return true }; _chunks.append(data); _buffered += data.count; wakeLocked(); return _buffered < 65_536
    }
    func finish() { _condition.lock(); _ended = true; wakeLocked(); _condition.unlock() }
    func close() { _condition.lock(); _closed = true; _chunks.removeAll(); _buffered = 0; wakeLocked(); _condition.unlock() }
    private func wakeLocked() { if let loop = _runLoop { CFRunLoopPerformBlock(loop, CFRunLoopMode.defaultMode.rawValue) {}; CFRunLoopWakeUp(loop) } }
    private func writeLoop() {
        let loop = RunLoop.current
        _condition.lock(); _runLoop = CFRunLoopGetCurrent(); _condition.unlock()
        _output.delegate = self; _output.schedule(in: loop, forMode: .default); _output.open()
        defer { _output.close(); _output.remove(from: loop, forMode: .default); _condition.lock(); _runLoop = nil; _condition.unlock() }
        while true {
            _condition.lock(); let complete = _closed || (_ended && _chunks.isEmpty); _condition.unlock(); if complete { return }
            pump()
            _ = loop.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
        }
    }
    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        if eventCode.contains(.hasSpaceAvailable) { pump() }
        if eventCode.contains(.errorOccurred) || eventCode.contains(.endEncountered) { close() }
    }
    private func pump() {
        while _output.hasSpaceAvailable {
            _condition.lock()
            guard !_closed, let data = _chunks.first else { _condition.unlock(); return }
            let offset = _offset; _condition.unlock()
            let count = data.withUnsafeBytes { bytes in _output.write(bytes.baseAddress!.assumingMemoryBound(to: UInt8.self).advanced(by: offset), maxLength: min(16_384, data.count - offset)) }
            if count < 0 { close(); return }; if count == 0 { return }
            _condition.lock()
            if !_closed {
                _offset += count; _buffered -= count
                if _offset == data.count { _chunks.removeFirst(); _offset = 0 }
            }
            let callback = _buffered < 32_768 ? _onCapacity : nil; _condition.unlock(); callback?()
        }
    }
}
