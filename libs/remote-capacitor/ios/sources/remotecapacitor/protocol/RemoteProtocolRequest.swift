// #region Imports
import Foundation
// #endregion

/// Bounded protocol-only URLSession requests; redirects and implicit mutation retries are rejected.
internal final class RemoteProtocolRequest: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate {
    private var _session: URLSession?
    private var _task: URLSessionDataTask?
    private var _data = Data()
    private var _continuation: CheckedContinuation<[String: Any], Error>?
    private let _lock = NSLock()
    func cancel() { _lock.lock(); let task = _task; _lock.unlock(); task?.cancel() }
    func execute(origin: String, path: String, method: String, body: [String: Any]?, credential: String?) async throws -> [String: Any] {
        _ = try RemotePeerPolicy.origin(origin); _ = try RemotePeerPolicy.path(path)
        var request = URLRequest(url: URL(string: origin + path)!); request.httpMethod = method; request.timeoutInterval = 15; request.setValue("application/json", forHTTPHeaderField: "Accept"); if let credential { request.setValue("Bearer " + credential, forHTTPHeaderField: "Authorization") }; if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body); request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let configuration = URLSessionConfiguration.ephemeral; configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil; configuration.urlCache = nil; configuration.requestCachePolicy = .reloadIgnoringLocalCacheData; configuration.connectionProxyDictionary = [:]
        return try await withTaskCancellationHandler(operation: { try await withCheckedThrowingContinuation { continuation in _lock.lock(); _continuation = continuation; let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil); _session = session; let task = session.dataTask(with: request); _task = task; _lock.unlock(); if Task.isCancelled { task.cancel() } else { task.resume() } } }, onCancel: { self._lock.lock(); let task = self._task; self._lock.unlock(); task?.cancel() })
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) { guard let response = response as? HTTPURLResponse, (200...299).contains(response.statusCode), response.expectedContentLength <= 65_536 else { completionHandler(.cancel); return }; completionHandler(.allow) }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) { if _data.count + data.count > 65_536 { dataTask.cancel() } else { _data.append(data) } }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) { _lock.lock(); let continuation = _continuation; _continuation = nil; _task = nil; _session = nil; _lock.unlock(); defer { session.finishTasksAndInvalidate() }; if let error { continuation?.resume(throwing: error) } else { do { guard let value = try JSONSerialization.jsonObject(with: _data) as? [String: Any] else { throw RemoteNativeError.invalidRequest }; continuation?.resume(returning: value) } catch { continuation?.resume(throwing: error) } } }
}
