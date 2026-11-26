// #region Imports
import Foundation
import Security
import NIOCore
import NIOConcurrencyHelpers
import NIOHTTP1
import NIOWebSocket
import NIOTransportServices
// #endregion

/// Protected loopback server serves only packaged content and admitted selected-peer routes.
internal final class RemoteLocalGateway: @unchecked Sendable {
    let configuration: RemoteNativeConfiguration
    let remoteOrigin: String
    let credential: String
    let capabilities: Set<String>
    let cookie: String
    let protocolRoutes: [String: String]
    private let _group = NIOTSEventLoopGroup(loopCount: 1)
    private let _lock = NSLock()
    private var _listener: Channel?
    private var _closed = false
    private var _children: [ObjectIdentifier: Channel] = [:]
    private(set) var origin = ""
    init(configuration: RemoteNativeConfiguration, origin: String, credential: String, capabilities: Set<String>) throws {
        self.configuration = configuration; self.remoteOrigin = origin; self.credential = credential; self.capabilities = capabilities; self.protocolRoutes = try RemoteProtocolContract().routes
        var bytes = [UInt8](repeating: 0, count: 32); guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw RemoteNativeError.persistence }; cookie = bytes.map { String(format: "%02x", $0) }.joined()
    }
    func start() async throws -> String {
        let listener = try await NIOTSListenerBootstrap(group: _group).childChannelInitializer { channel in
            self._lock.lock(); self._children[ObjectIdentifier(channel)] = channel; self._lock.unlock()
            channel.closeFuture.whenComplete { _ in self._lock.lock(); self._children.removeValue(forKey: ObjectIdentifier(channel)); self._lock.unlock() }
            let http = RemoteGatewayHTTPHandler(gateway: self)
            let upgrader = NIOWebSocketServerUpgrader(maxFrameSize: 65_536, shouldUpgrade: { channel, head in channel.eventLoop.makeSucceededFuture(self.admit(head, kind: "websocket") != nil ? HTTPHeaders() : nil) }, upgradePipelineHandler: { channel, head in channel.pipeline.addHandler(RemoteGatewayWebSocketHandler(gateway: self, path: head.uri)) })
            return channel.pipeline.configureHTTPServerPipeline(withServerUpgrade: (upgraders: [upgrader], completionHandler: { context in context.pipeline.removeHandler(http, promise: nil) })).flatMap { channel.pipeline.addHandler(http) }
        }.bind(host: "127.0.0.1", port: 0).get()
        guard let port = listener.localAddress?.port else { try? await listener.close().get(); throw RemoteNativeError.network }; _listener = listener; origin = "http://127.0.0.1:\(port)"; return origin
    }
    private func detach() -> ([Channel], Channel?)? { _lock.lock(); defer { _lock.unlock() }; if _closed { return nil }; _closed = true; let channels = Array(_children.values); _children.removeAll(); let listener = _listener; _listener = nil; return (channels, listener) }
    func close() async { guard let (channels, listener) = detach() else { return }; for channel in channels { try? await channel.close().get() }; try? await listener?.close().get(); try? await _group.shutdownGracefully() }
    func authorized(_ head: HTTPRequestHead) -> Bool {
        guard head.headers["host"].count == 1, head.headers.first(name: "host") == origin.replacingOccurrences(of: "http://", with: ""), head.headers.first(name: "origin") == nil || head.headers.first(name: "origin") == origin, !["cross-site", "same-site"].contains(head.headers.first(name: "sec-fetch-site") ?? "") else { return false }
        let cookies = head.headers["cookie"].joined(separator: ";").split(separator: ";").map { $0.trimmingCharacters(in: .whitespaces).split(separator: "=", maxSplits: 1).map(String.init) }.filter { $0.count == 2 && $0[0] == "remote_local" }
        guard cookies.count == 1 else { return false }; let actual = Array(cookies[0][1].utf8), expected = Array(cookie.utf8); guard actual.count == expected.count else { return false }; return zip(actual, expected).reduce(UInt8(0)) { $0 | ($1.0 ^ $1.1) } == 0
    }
    func admit(_ head: HTTPRequestHead, kind: String? = nil) -> RemoteNativeConfiguration.Route? { guard authorized(head), let path = try? RemotePeerPolicy.path(head.uri) else { return nil }; if kind == nil, (path == protocolRoutes["host"] && head.method == .GET || path == protocolRoutes["session"] && [.GET, .DELETE].contains(head.method)) { return try? RemoteNativeConfiguration.Route(id: "sdk-control", method: head.method.rawValue, path: path, kind: "http", capabilities: [], maxRequestBytes: 0) }; guard let selected = RemoteRouteMatcher.match(configuration.routes, method: head.method.rawValue, path: head.uri), kind == nil || selected.kind == kind, capabilities.isSuperset(of: selected.capabilities) else { return nil }; return selected }
    func revoke() { Task { await self.close() } }
}

private final class RemoteGatewayHTTPHandler: ChannelInboundHandler, RemovableChannelHandler {
    typealias InboundIn = HTTPServerRequestPart
    typealias OutboundOut = HTTPServerResponsePart
    private let _gateway: RemoteLocalGateway
    private var _head: HTTPRequestHead?
    private var _proxy: RemoteGatewayHTTPExchange?
    private var _received = 0
    private var _route: RemoteNativeConfiguration.Route?
    init(gateway: RemoteLocalGateway) { _gateway = gateway }
    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        switch unwrapInboundIn(data) {
        case .head(let head):
            guard _head == nil, _gateway.authorized(head), (try? RemotePeerPolicy.path(head.uri)) != nil else { respond(context, .unauthorized); return }; _head = head; _route = _gateway.admit(head)
            if let route = _route, route.kind != "websocket" { if ["script", "style", "worker", "sharedworker", "serviceworker", "document", "iframe", "frame", "object", "embed"].contains(head.headers.first(name: "sec-fetch-dest")?.lowercased() ?? "") { respond(context, .forbidden); return }; do { let proxy = try RemoteGatewayHTTPExchange(gateway: _gateway, context: context, head: head, route: route); _proxy = proxy; proxy.start() } catch { respond(context, .badGateway) } }
        case .body(var body):
            guard let route = _route, let proxy = _proxy else { respond(context, .badRequest); return }; _received += body.readableBytes; guard _received <= route.maxRequestBytes else { proxy.cancel(); respond(context, .payloadTooLarge); return }
            do { let capacity = try proxy.upload.push(Data(body.readBytes(length: body.readableBytes) ?? [])); if !capacity { context.channel.setOption(ChannelOptions.autoRead, value: false).whenFailure { _ in context.close(promise: nil) } } } catch { proxy.cancel(); context.close(promise: nil) }
        case .end:
            if let proxy = _proxy { proxy.upload.finish(); return }
            guard let head = _head, ["GET", "HEAD"].contains(head.method.rawValue), let path = try? RemotePeerPolicy.path(head.uri), !path.hasPrefix("/__remote/") else { respond(context, .notFound); return }
            let root = _gateway.configuration.assetsDirectory.resolvingSymlinksInPath(), file = _gateway.configuration.assetsDirectory.appendingPathComponent(path == "/" ? "index.html" : String(path.dropFirst())).resolvingSymlinksInPath()
            guard file.path.hasPrefix(root.path + "/"), let handle = try? FileHandle(forReadingFrom: file), (try? file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true else { respond(context, .notFound); return }
            let mime = ["html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json", "svg": "image/svg+xml", "png": "image/png", "woff2": "font/woff2"][file.pathExtension] ?? "application/octet-stream"
            var headers = HTTPHeaders(); headers.add(name: "content-type", value: mime); headers.add(name: "connection", value: "close"); headers.add(name: "x-content-type-options", value: "nosniff"); headers.add(name: "content-security-policy", value: RemoteContentSecurityPolicy.packaged(_gateway.configuration.contentPolicy))
            context.write(wrapOutboundOut(.head(HTTPResponseHead(version: .http1_1, status: .ok, headers: headers))), promise: nil)
            if head.method == .HEAD { try? handle.close(); finish(context) } else { fileChunk(context, handle) }
        }
    }
    private func fileChunk(_ context: ChannelHandlerContext, _ handle: FileHandle) { DispatchQueue.global(qos: .utility).async { let chunk = try? handle.read(upToCount: 32_768); context.eventLoop.execute { guard context.channel.isActive else { try? handle.close(); return }; guard let chunk, !chunk.isEmpty else { try? handle.close(); self.finish(context); return }; var buffer = context.channel.allocator.buffer(capacity: chunk.count); buffer.writeBytes(chunk); context.writeAndFlush(self.wrapOutboundOut(.body(.byteBuffer(buffer)))).whenComplete { result in if case .success = result { self.fileChunk(context, handle) } else { try? handle.close(); context.close(promise: nil) } } } } }
    private func finish(_ context: ChannelHandlerContext) { context.writeAndFlush(wrapOutboundOut(.end(nil))).whenComplete { _ in context.close(promise: nil) } }
    private func respond(_ context: ChannelHandlerContext, _ status: HTTPResponseStatus) { context.write(wrapOutboundOut(.head(HTTPResponseHead(version: .http1_1, status: status, headers: ["connection": "close"]))), promise: nil); finish(context) }
    func channelInactive(context: ChannelHandlerContext) { _proxy?.cancel(); context.fireChannelInactive() }
    func errorCaught(context: ChannelHandlerContext, error: Error) { _proxy?.cancel(); context.close(promise: nil) }
}

private final class RemoteGatewayHTTPExchange: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate {
    let upload = RemoteUploadStream()
    private let _gateway: RemoteLocalGateway
    private let _context: NIOLoopBound<ChannelHandlerContext>
    private let _state = NIOLockedValueBox<(session: URLSession?, task: URLSessionTask?)>((nil, nil))
    private let _request: URLRequest
    private let _isRevocation: Bool
    private let _responded = NIOLockedValueBox(false)
    private let _bodySupplied = NIOLockedValueBox(false)
    init(gateway: RemoteLocalGateway, context: ChannelHandlerContext, head: HTTPRequestHead, route: RemoteNativeConfiguration.Route) throws {
        _ = try RemotePeerPolicy.origin(gateway.remoteOrigin); _gateway = gateway; _context = NIOLoopBound(context, eventLoop: context.eventLoop)
        var request = URLRequest(url: URL(string: gateway.remoteOrigin + head.uri)!); request.httpMethod = route.method; request.setValue("Bearer " + gateway.credential, forHTTPHeaderField: "Authorization")
        for name in ["Accept", "Content-Type", "Range", "If-Range", "If-None-Match", "Last-Event-ID"] { if let value = head.headers.first(name: name) { request.setValue(value, forHTTPHeaderField: name) } }
        if !["GET", "HEAD"].contains(route.method) { request.httpBodyStream = upload.input }
        _request = request
        _isRevocation = head.method == .DELETE && (try? RemotePeerPolicy.path(head.uri)) == gateway.protocolRoutes["session"]
        super.init(); let bound = _context; upload.onCapacity = { bound.eventLoop.execute { bound.value.channel.setOption(ChannelOptions.autoRead, value: true).whenFailure { _ in bound.value.close(promise: nil) } } }
    }
    func start() { let configuration = URLSessionConfiguration.ephemeral; configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil; configuration.urlCache = nil; configuration.connectionProxyDictionary = [:]; configuration.timeoutIntervalForRequest = 3600; configuration.timeoutIntervalForResource = 86_400; let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil); if _request.httpBodyStream != nil { upload.start() }; let task = _request.httpBodyStream == nil ? session.dataTask(with: _request) as URLSessionTask : session.uploadTask(withStreamedRequest: _request); _state.withLockedValue { $0 = (session, task) }; task.resume() }
    func cancel() { upload.close(); let state = _state.withLockedValue { value in let previous = value; value = (nil, nil); return previous }; state.task?.cancel(); state.session?.invalidateAndCancel() }
    func urlSession(_ session: URLSession, task: URLSessionTask, needNewBodyStream completionHandler: @escaping (InputStream?) -> Void) { let first = _bodySupplied.withLockedValue { supplied in if supplied { return false }; supplied = true; return true }; completionHandler(first ? upload.input : nil) }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let response = response as? HTTPURLResponse, !(300...399).contains(response.statusCode) else { completionHandler(.cancel); return }
        if response.statusCode == 401 {
            _responded.withLockedValue { $0 = true }
            _context.eventLoop.execute {
                self._context.value.write(NIOAny(HTTPServerResponsePart.head(HTTPResponseHead(version: .http1_1, status: .unauthorized, headers: ["connection": "close"]))), promise: nil)
                self._context.value.writeAndFlush(NIOAny(HTTPServerResponsePart.end(nil))).whenComplete { _ in self._gateway.revoke(); self._context.value.close(promise: nil) }
            }
            completionHandler(.cancel); return
        }
        let mediaType = response.value(forHTTPHeaderField: "Content-Type")?.lowercased().split(separator: ";").first.map(String.init) ?? "application/octet-stream"
        if mediaType.range(of: "javascript|ecmascript|html|svg\\+xml", options: .regularExpression) != nil {
            _responded.withLockedValue { $0 = true }
            _context.eventLoop.execute {
                self._context.value.write(NIOAny(HTTPServerResponsePart.head(HTTPResponseHead(version: .http1_1, status: .forbidden, headers: ["connection": "close", "x-content-type-options": "nosniff"]))), promise: nil)
                self._context.value.writeAndFlush(NIOAny(HTTPServerResponsePart.end(nil))).whenComplete { _ in self._context.value.close(promise: nil) }
            }
            completionHandler(.cancel); return
        }
        var headers = HTTPHeaders(); headers.add(name: "content-security-policy", value: "sandbox; default-src 'none'; frame-ancestors 'none'"); for name in ["Content-Type", "Content-Range", "Accept-Ranges", "ETag", "Cache-Control", "Last-Modified"] { if let value = response.value(forHTTPHeaderField: name) { headers.add(name: name, value: value) } }; headers.add(name: "connection", value: "close"); headers.add(name: "x-content-type-options", value: "nosniff")
        _context.eventLoop.execute { self._context.value.writeAndFlush(NIOAny(HTTPServerResponsePart.head(HTTPResponseHead(version: .http1_1, status: HTTPResponseStatus(statusCode: response.statusCode), headers: headers))), promise: nil); completionHandler(.allow) }
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) { dataTask.suspend(); _context.eventLoop.execute { guard self._context.value.channel.isActive else { self.cancel(); return }; var buffer = self._context.value.channel.allocator.buffer(capacity: data.count); buffer.writeBytes(data); self._context.value.writeAndFlush(NIOAny(HTTPServerResponsePart.body(.byteBuffer(buffer)))).whenComplete { result in if case .success = result { dataTask.resume() } else { self.cancel() } } } }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) { upload.close(); _context.eventLoop.execute { if self._responded.withLockedValue({ $0 }) { return }; if error == nil { self._context.value.writeAndFlush(NIOAny(HTTPServerResponsePart.end(nil))).whenComplete { _ in if self._isRevocation { self._gateway.revoke() }; self._context.value.close(promise: nil) } } else { self._context.value.close(promise: nil) } }; session.finishTasksAndInvalidate(); _state.withLockedValue { $0 = (nil, nil) } }
}

private final class RemoteGatewayWebSocketHandler: NSObject, ChannelInboundHandler, URLSessionTaskDelegate {
    typealias InboundIn = WebSocketFrame
    typealias OutboundOut = WebSocketFrame
    private let _gateway: RemoteLocalGateway
    private let _path: String
    private var _session: URLSession?
    private var _task: URLSessionWebSocketTask?
    private var _fragments = Data()
    private var _opcode: WebSocketOpcode?
    init(gateway: RemoteLocalGateway, path: String) { _gateway = gateway; _path = path; super.init() }
    func handlerAdded(context: ChannelHandlerContext) { var request = URLRequest(url: URL(string: _gateway.remoteOrigin.replacingOccurrences(of: "http", with: "ws", options: .anchored) + _path)!); request.setValue("Bearer " + _gateway.credential, forHTTPHeaderField: "Authorization"); let configuration = URLSessionConfiguration.ephemeral; configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil; configuration.urlCache = nil; configuration.connectionProxyDictionary = [:]; let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil); _session = session; let task = session.webSocketTask(with: request); task.maximumMessageSize = 65_536; _task = task; task.resume(); receive(context, task) }
    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let frame = unwrapInboundIn(data)
        if frame.opcode == .connectionClose { context.close(promise: nil); return }
        if frame.opcode == .ping { context.writeAndFlush(wrapOutboundOut(WebSocketFrame(fin: true, opcode: .pong, data: frame.unmaskedData)), promise: nil); return }
        if frame.opcode == .pong { return }
        guard [.text, .binary, .continuation].contains(frame.opcode), _fragments.count + frame.length <= 65_536 else { context.close(promise: nil); return }
        if frame.opcode != .continuation { guard _opcode == nil else { context.close(promise: nil); return }; _opcode = frame.opcode } else if _opcode == nil { context.close(promise: nil); return }
        var payload = frame.unmaskedData; _fragments.append(contentsOf: payload.readBytes(length: payload.readableBytes) ?? []); guard frame.fin else { return }
        let message: URLSessionWebSocketTask.Message; if _opcode == .text { guard let text = String(data: _fragments, encoding: .utf8) else { context.close(promise: nil); return }; message = .string(text) } else { message = .data(_fragments) }; _opcode = nil; _fragments.removeAll(keepingCapacity: true)
        _task?.send(message) { error in if error != nil { context.eventLoop.execute { context.close(promise: nil) } } }
    }
    private func receive(_ context: ChannelHandlerContext, _ task: URLSessionWebSocketTask) { task.receive { result in context.eventLoop.execute { guard context.channel.isActive else { return }; switch result { case .success(let message): var buffer = context.channel.allocator.buffer(capacity: 0); let opcode: WebSocketOpcode; switch message { case .string(let text): buffer.writeString(text); opcode = .text; case .data(let data): buffer.writeBytes(data); opcode = .binary; @unknown default: context.close(promise: nil); return }; guard buffer.readableBytes <= 65_536 else { context.close(promise: nil); return }; context.writeAndFlush(self.wrapOutboundOut(WebSocketFrame(fin: true, opcode: opcode, data: buffer))).whenComplete { result in if case .success = result { self.receive(context, task) } else { context.close(promise: nil) } }; case .failure: context.close(promise: nil) } } } }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) { if (task.response as? HTTPURLResponse)?.statusCode == 401 { _gateway.revoke() } }
    func channelInactive(context: ChannelHandlerContext) { _task?.cancel(with: .goingAway, reason: nil); _session?.invalidateAndCancel(); _task = nil; _session = nil; context.fireChannelInactive() }
    func errorCaught(context: ChannelHandlerContext, error: Error) { context.close(promise: nil) }
}
