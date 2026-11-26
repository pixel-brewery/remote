package de.pixelbrewery.remote.bridge.interfaces

// #region Imports
// #endregion

/** Activity-owned trusted bridge recreation; no remote content URL is ever admitted. */
public interface IRemoteViewOwner {
    /** Open an authenticated loopback origin, or null to return to the application's packaged root. */
    public fun openRemoteView(origin: String?)
}
