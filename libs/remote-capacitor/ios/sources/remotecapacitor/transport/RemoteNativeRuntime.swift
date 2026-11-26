// #region Imports
import Foundation
import CryptoKit
// #endregion

/// Serialized native control runtime. Credentials never cross its view descriptor boundary.
internal actor RemoteNativeRuntime {
    private let _configuration: RemoteNativeConfiguration
    private let _contract: RemoteProtocolContract
    private let _store: RemoteSecureStore
    private var _gateway: RemoteLocalGateway?
    private var _connectionId: String?
    private var _attempts: [String: (id: String, name: String, expires: Date)] = [:]
    private var _protocolRequest: RemoteProtocolRequest?
    private var _busy = false
    private var _disposed = false
    struct Activation { let view: [String: Any]; let cookie: String }
    init(configuration: RemoteNativeConfiguration) throws { _configuration = configuration; _contract = try RemoteProtocolContract(); _store = RemoteSecureStore(appId: configuration.appId) }
    func invoke(_ raw: [String: Any], activate: @escaping @MainActor (Activation) async throws -> Void) async throws -> [String: Any] {
        guard !_disposed, !_busy else { throw RemoteNativeError.disposed }; _busy = true; defer { _busy = false }
        let request = try _contract.validate("remoteNativeRequest", raw)
        let response: [String: Any]
        switch request["kind"] as! String {
        case "connections.list": response = ["kind": "connections", "connections": try profiles()]
        case "connections.close": if _connectionId == request["connectionId"] as? String { await close() }; response = ["kind": "done"]
        case "connections.forget": let id = request["connectionId"] as! String; if _connectionId == id { await close() }; var records = try _store.read(); records.removeValue(forKey: id); try _store.write(records); response = ["kind": "done"]
        case "connections.open":
            let id = request["connectionId"] as! String
            guard let record = try _store.read()[id] as? [String: Any], let credential = record["credential"] as? String, let rawProfile = record["profile"] as? [String: Any] else { throw RemoteNativeError.unauthorized }
            let profile = try _contract.validate("remoteSavedConnection", rawProfile), identity = profile["identity"] as! [String: Any]; try checkIdentity(identity)
            let endpoint = (profile["endpoints"] as! [[String: Any]]).first { $0["id"] as? String == profile["selectedEndpointId"] as? String }!, origin = endpoint["origin"] as! String; _ = try RemotePeerPolicy.origin(origin)
            let host = try await protocolRequest(origin, "GET", "host", nil, nil, "remoteHostDescriptor"); try checkIdentity(host["identity"] as! [String: Any], hostId: identity["hostId"] as? String)
            let session = try await protocolRequest(origin, "GET", "session", nil, credential, "remoteSessionDescriptor"); try checkSession(session, host: host)
            let activation = try await open(id, origin: origin, credential: credential, identity: identity, session: session); try await activate(activation); response = ["kind": "view", "view": activation.view]
        case "pairings.complete":
            let invitation = request["bootstrap"] as! [String: Any]; try checkIdentity(invitation); let origin = invitation["origin"] as! String; _ = try RemotePeerPolicy.origin(origin)
            guard let expires = RemoteProtocolContract.timestamp(invitation["expiresAt"] as! String), expires > Date() else { throw RemoteNativeError.expired }
            let host = try await protocolRequest(origin, "GET", "host", nil, nil, "remoteHostDescriptor"); try checkIdentity(host["identity"] as! [String: Any], hostId: invitation["hostId"] as? String)
            _attempts = _attempts.filter { $0.value.expires > Date() }; let challenge = invitation["challenge"] as! String, name = request["deviceName"] as! String; guard _attempts[challenge] != nil || _attempts.count < 16 else { throw RemoteNativeError.invalidRequest }
            let attempt = _attempts[challenge] ?? (id: UUID().uuidString, name: name, expires: expires); guard attempt.name == name else { throw RemoteNativeError.invalidRequest }; _attempts[challenge] = attempt
            let body = try _contract.validate("remotePairingRequest", ["challenge": challenge, "attemptId": attempt.id, "deviceName": name, "credentialMode": "bearer"])
            let paired = try await protocolRequest(origin, "POST", "pairings", body, nil, "remotePairingResponse"); guard paired["status"] as? String == "paired" else { throw RemoteNativeError.pending }
            guard let credential = paired["credential"] as? String, (32...256).contains(credential.count), let session = paired["session"] as? [String: Any] else { throw RemoteNativeError.invalidRequest }; try checkSession(session, host: host)
            let endpoints = host["endpoints"] as! [[String: Any]]; guard let endpoint = endpoints.first(where: { $0["origin"] as? String == origin }) else { throw RemoteNativeError.invalidRequest }
            let id = SHA256.hash(data: Data((_configuration.appId + "\0" + (invitation["hostId"] as! String)).utf8)).map { String(format: "%02x", $0) }.joined()
            let profile = try _contract.validate("remoteSavedConnection", ["id": id, "identity": host["identity"]!, "label": host["name"]!, "endpoints": endpoints, "selectedEndpointId": endpoint["id"]!])
            var records = try _store.read(); guard records[id] != nil || records.count < 64 else { throw RemoteNativeError.persistence }; records[id] = ["profile": profile, "credential": credential]; try _store.write(records); _attempts.removeValue(forKey: challenge)
            let activation = try await open(id, origin: origin, credential: credential, identity: host["identity"] as! [String: Any], session: session); try await activate(activation); response = ["kind": "view", "view": activation.view]
        default: throw RemoteNativeError.invalidRequest
        }
        return try _contract.validate("remoteNativeResponse", response)
    }
    func dispose() async { _disposed = true; _protocolRequest?.cancel(); await close(); _attempts.removeAll() }
    private func profiles() throws -> [[String: Any]] { try _store.read().values.map { record in let profile = try _contract.validate("remoteSavedConnection", (record as! [String: Any])["profile"] as! [String: Any]); try checkIdentity(profile["identity"] as! [String: Any]); return profile } }
    private func checkIdentity(_ identity: [String: Any], hostId: String? = nil) throws { guard identity["appId"] as? String == _configuration.appId, hostId == nil || identity["hostId"] as? String == hostId else { throw RemoteNativeError.forbidden } }
    private func checkSession(_ session: [String: Any], host: [String: Any]) throws { let identity = host["identity"] as! [String: Any]; try checkIdentity((session["host"] as! [String: Any])["identity"] as! [String: Any], hostId: identity["hostId"] as? String); try checkIdentity(session["principal"] as! [String: Any], hostId: identity["hostId"] as? String) }
    private func protocolRequest(_ origin: String, _ method: String, _ route: String, _ body: [String: Any]?, _ credential: String?, _ schema: String) async throws -> [String: Any] { guard !_disposed else { throw RemoteNativeError.disposed }; let request = RemoteProtocolRequest(); _protocolRequest = request; defer { _protocolRequest = nil }; let result = try await request.execute(origin: origin, path: _contract.routes[route]!, method: method, body: body, credential: credential); guard !_disposed else { throw RemoteNativeError.disposed }; return try _contract.validate(schema, result) }
    private func open(_ id: String, origin: String, credential: String, identity: [String: Any], session: [String: Any]) async throws -> Activation { await close(); guard !_disposed else { throw RemoteNativeError.disposed }; let principal = session["principal"] as! [String: Any], capabilities = Set(principal["capabilities"] as! [String]); let gateway = try RemoteLocalGateway(configuration: _configuration, origin: origin, credential: credential, capabilities: capabilities); let localOrigin = try await gateway.start(); guard !_disposed else { await gateway.close(); throw RemoteNativeError.disposed }; _gateway = gateway; _connectionId = id; return Activation(view: try _contract.validate("remoteLocalView", ["connectionId": id, "identity": identity, "origin": localOrigin]), cookie: gateway.cookie) }
    private func close() async { let gateway = _gateway; _gateway = nil; _connectionId = nil; await gateway?.close() }
}
