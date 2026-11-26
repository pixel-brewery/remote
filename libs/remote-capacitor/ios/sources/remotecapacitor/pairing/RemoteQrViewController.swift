// #region Imports
import AVFoundation
import UIKit
// #endregion

/// Native AVFoundation QR sheet; pairing material never enters logs or remote scripts.
internal final class RemoteQrViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate, UIAdaptivePresentationControllerDelegate {
    private let _session = AVCaptureSession()
    private let _queue = DispatchQueue(label: "de.pixelbrewery.remote.qr")
    private var _completion: ((String?) -> Void)?
    init(completion: @escaping (String?) -> Void) { _completion = completion; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("Use the native scanner initializer.") }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .black; presentationController?.delegate = self
        let preview = AVCaptureVideoPreviewLayer(session: _session); preview.videoGravity = .resizeAspectFill; preview.frame = view.bounds; view.layer.addSublayer(preview)
        let cancel = UIButton(type: .system); cancel.setTitle("Cancel", for: .normal); cancel.accessibilityIdentifier = "remote-qr-cancel"; cancel.addTarget(self, action: #selector(cancelled), for: .touchUpInside); cancel.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(cancel); NSLayoutConstraint.activate([cancel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16), cancel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16)])
        _queue.async { do { guard let camera = AVCaptureDevice.default(for: .video) else { throw RemoteNativeError.forbidden }; let input = try AVCaptureDeviceInput(device: camera), output = AVCaptureMetadataOutput(); guard self._session.canAddInput(input), self._session.canAddOutput(output) else { throw RemoteNativeError.forbidden }; self._session.addInput(input); self._session.addOutput(output); output.setMetadataObjectsDelegate(self, queue: .main); output.metadataObjectTypes = [.qr]; self._session.startRunning() } catch { DispatchQueue.main.async { self.complete(nil) } } }
    }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); (view.layer.sublayers?.first as? AVCaptureVideoPreviewLayer)?.frame = view.bounds }
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) { guard let value = (metadataObjects.first as? AVMetadataMachineReadableCodeObject)?.stringValue, value.utf8.count <= 8192 else { return }; complete(value) }
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { complete(nil) }
    @objc private func cancelled() { complete(nil) }
    private func complete(_ raw: String?) { guard let completion = _completion else { return }; _completion = nil; _queue.async { self._session.stopRunning() }; dismiss(animated: true) { completion(raw) } }
}
