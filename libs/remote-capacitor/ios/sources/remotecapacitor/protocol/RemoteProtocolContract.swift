// #region Imports
import Foundation
import CoreFoundation
// #endregion

/// Canonical Zod-generated JSON schema and shared semantic refinements, without a second wire model.
internal struct RemoteProtocolContract {
    let bundle: [String: Any]
    init() throws { let url = Bundle.module.url(forResource: "remote-protocol-v1", withExtension: "json")!; bundle = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]; guard bundle["protocolVersion"] as? Int == 1 else { throw RemoteNativeError.invalidContract } }
    var routes: [String: String] { bundle["routes"] as! [String: String] }
    func validate(_ name: String, _ value: [String: Any]) throws -> [String: Any] {
        let normalized = try semantics(value) as! [String: Any]
        guard let schema = (bundle["schemas"] as? [String: [String: Any]])?[name] else { throw RemoteNativeError.invalidContract }
        try check(schema, normalized); return normalized
    }
    func invitation(_ raw: String) throws -> [String: Any] {
        guard raw.utf8.count <= 8192, let components = URLComponents(string: raw), let scheme = components.scheme, let host = components.host else { throw RemoteNativeError.invalidRequest }
        let fragment = URLComponents(string: "?" + (components.percentEncodedFragment ?? ""))?.queryItems ?? []
        func field(_ name: String) throws -> String { let entries = fragment.filter { $0.name == name }; guard entries.count == 1, let value = entries.first?.value else { throw RemoteNativeError.invalidRequest }; return value }
        let origin = "\(scheme)://\(host.contains(":") ? "[\(host)]" : host)" + (components.port.map { ":\($0)" } ?? "")
        return try validate("remotePairingBootstrap", ["appId": field("app"), "hostId": field("host"), "origin": origin, "challenge": field("pair"), "expiresAt": field("expires")])
    }
    static func timestamp(_ value: String) -> Date? { let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; if let result = formatter.date(from: value) { return result }; formatter.formatOptions = [.withInternetDateTime]; return formatter.date(from: value) }
    private func semantics(_ value: Any) throws -> Any {
        if let array = value as? [Any] { return try array.map(semantics) }
        guard var object = value as? [String: Any] else { return value }
        for key in ["name", "label", "deviceName"] { if let text = object[key] as? String { object[key] = text.trimmingCharacters(in: .whitespacesAndNewlines) } }
        if let origin = object["origin"] as? String { guard let url = URLComponents(string: origin), ["http", "https"].contains(url.scheme ?? ""), url.host != nil, url.user == nil, url.password == nil, ["", "/"].contains(url.path), url.query == nil, url.fragment == nil else { throw RemoteNativeError.invalidRequest } }
        if let host = object["host"] as? [String: Any], let principal = object["principal"] as? [String: Any], let identity = host["identity"] as? [String: Any] { guard identity["appId"] as? String == principal["appId"] as? String, identity["hostId"] as? String == principal["hostId"] as? String else { throw RemoteNativeError.invalidRequest } }
        if let selected = object["selectedEndpointId"] as? String { guard let endpoints = object["endpoints"] as? [[String: Any]], endpoints.contains(where: { $0["id"] as? String == selected }) else { throw RemoteNativeError.invalidRequest } }
        for (key, nested) in object { object[key] = try semantics(nested) }; return object
    }
    private func check(_ schema: [String: Any], _ value: Any) throws {
        if schema["$ref"] != nil { throw RemoteNativeError.invalidContract }
        if let choices = schema["anyOf"] as? [[String: Any]] { guard choices.contains(where: { (try? check($0, value)) != nil }) else { throw RemoteNativeError.invalidRequest }; return }
        if let choices = schema["oneOf"] as? [[String: Any]] { guard choices.filter({ (try? check($0, value)) != nil }).count == 1 else { throw RemoteNativeError.invalidRequest }; return }
        if let constant = schema["const"] { guard equal(constant, value) else { throw RemoteNativeError.invalidRequest } }
        if let values = schema["enum"] as? [Any] { guard values.contains(where: { equal($0, value) }) else { throw RemoteNativeError.invalidRequest } }
        switch schema["type"] as? String {
        case "object":
            guard let object = value as? [String: Any] else { throw RemoteNativeError.invalidRequest }
            let properties = schema["properties"] as? [String: [String: Any]] ?? [:]
            for key in schema["required"] as? [String] ?? [] { guard object[key] != nil else { throw RemoteNativeError.invalidRequest } }
            for (key, nested) in object { if let property = properties[key] { try check(property, nested) } else if schema["additionalProperties"] as? Bool == false { throw RemoteNativeError.invalidRequest } }
        case "array": guard let array = value as? [Any], array.count >= (schema["minItems"] as? Int ?? 0), array.count <= (schema["maxItems"] as? Int ?? .max) else { throw RemoteNativeError.invalidRequest }; if let item = schema["items"] as? [String: Any] { for nested in array { try check(item, nested) } }
        case "string":
            guard let text = value as? String, text.utf16.count >= (schema["minLength"] as? Int ?? 0), text.utf16.count <= (schema["maxLength"] as? Int ?? .max) else { throw RemoteNativeError.invalidRequest }
            if let pattern = schema["pattern"] as? String { guard text.range(of: pattern, options: .regularExpression) != nil else { throw RemoteNativeError.invalidRequest } }
            switch schema["format"] as? String { case "date-time": guard Self.timestamp(text) != nil else { throw RemoteNativeError.invalidRequest }; case "uri", "url": guard URL(string: text)?.scheme != nil else { throw RemoteNativeError.invalidRequest }; case nil: break; default: throw RemoteNativeError.invalidContract }
        case "number", "integer": guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), (schema["type"] as? String != "integer" || number.doubleValue.rounded() == number.doubleValue) else { throw RemoteNativeError.invalidRequest }
        case "boolean": guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else { throw RemoteNativeError.invalidRequest }
        case "null": guard value is NSNull else { throw RemoteNativeError.invalidRequest }
        case nil: break
        default: throw RemoteNativeError.invalidContract
        }
    }
    private func equal(_ left: Any, _ right: Any) -> Bool { if let lhs = left as? NSNumber, let rhs = right as? NSNumber { return lhs == rhs && (CFGetTypeID(lhs) == CFBooleanGetTypeID()) == (CFGetTypeID(rhs) == CFBooleanGetTypeID()) }; return (left as? String) != nil && left as? String == right as? String }
}

internal enum RemoteNativeError: Error { case invalidContract, invalidRequest, forbidden, expired, pending, unauthorized, network, persistence, disposed }
