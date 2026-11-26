package de.pixelbrewery.remote.pairing

// #region Imports
import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
// #endregion

/** Camera-only native QR sheet; the bundled barcode model works without a Play Services download. */
public class RemoteQrActivity : AppCompatActivity() {
    private val _executor = Executors.newSingleThreadExecutor()
    private val _finished = AtomicBoolean(false)
    private val _scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())
    private val _permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) camera() else finish() }
    private lateinit var _preview: PreviewView
    public override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); _preview = PreviewView(this); _preview.contentDescription = "Scan a Remote pairing QR code"; setContentView(_preview); if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) camera() else _permission.launch(Manifest.permission.CAMERA) }
    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun camera() {
        val provider = ProcessCameraProvider.getInstance(this)
        provider.addListener({
            if (isFinishing) return@addListener
            val camera = provider.get()
            val preview = androidx.camera.core.Preview.Builder().build().also { it.setSurfaceProvider(_preview.surfaceProvider) }
            val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
            analysis.setAnalyzer(_executor) { proxy ->
                val image = proxy.image
                if (image == null || _finished.get()) { proxy.close(); return@setAnalyzer }
                _scanner.process(InputImage.fromMediaImage(image, proxy.imageInfo.rotationDegrees)).addOnSuccessListener { barcodes ->
                    val raw = barcodes.firstNotNullOfOrNull { it.rawValue }
                    if (raw != null && raw.length <= 8192 && _finished.compareAndSet(false, true)) { setResult(Activity.RESULT_OK, Intent().putExtra("invitation", raw)); finish() }
                }.addOnCompleteListener { proxy.close() }
            }
            camera.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }
    public override fun onDestroy() { _finished.set(true); _scanner.close(); _executor.shutdown(); super.onDestroy() }
}
