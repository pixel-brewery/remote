// #region Imports
import Foundation
// #endregion

/// Native projection of RemoteRouteRegistry with shared generated admission vectors.
internal enum RemoteRouteMatcher {
    static func validate(_ path: String) throws { guard try RemotePeerPolicy.path(path) == path, path.split(separator: "/", omittingEmptySubsequences: false).allSatisfy({ !$0.hasPrefix(":") || $0.range(of: "^:[A-Za-z][A-Za-z0-9_]*$", options: .regularExpression) != nil }) else { throw RemoteNativeError.invalidRequest } }
    static func match(_ routes: [RemoteNativeConfiguration.Route], method: String, path: String) -> RemoteNativeConfiguration.Route? {
        guard let normalized = try? RemotePeerPolicy.path(path) else { return nil }; let segments = normalized.split(separator: "/", omittingEmptySubsequences: false)
        let candidates = routes.filter { route in let template = route.path.split(separator: "/", omittingEmptySubsequences: false); return route.method == method && template.count == segments.count && zip(template, segments).allSatisfy { $0.0.hasPrefix(":") ? !$0.1.isEmpty : $0.0 == $0.1 } }
        func specificity(_ route: RemoteNativeConfiguration.Route) -> Int { route.path.split(separator: "/", omittingEmptySubsequences: false).filter { !$0.hasPrefix(":") }.count }
        guard let maximum = candidates.map(specificity).max() else { return nil }; let winners = candidates.filter { specificity($0) == maximum }; return winners.count == 1 ? winners.first : nil
    }
}
