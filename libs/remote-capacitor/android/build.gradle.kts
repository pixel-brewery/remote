buildscript {
    repositories { google(); mavenCentral() }
    dependencies {
        // AGP applies built-in Kotlin; this selects its compiler version without applying kotlin-android.
        // https://developer.android.com/build/releases/agp-9-0-0-release-notes#runtime-dependency-on-kgp
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")
    }
}

plugins {
    id("com.android.library") version "9.5.3"
}
android {
    namespace = "de.pixelbrewery.remote"
    compileSdk = 36
    defaultConfig { minSdk = 24; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
    testOptions { unitTests.isReturnDefaultValues = true }
}
kotlin { jvmToolchain(21) }
val ktor = "3.6.2"
dependencies {
    api(project(":capacitor-android"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("io.ktor:ktor-client-cio:$ktor")
    implementation("io.ktor:ktor-client-websockets:$ktor")
    implementation("io.ktor:ktor-server-cio:$ktor")
    implementation("io.ktor:ktor-server-websockets:$ktor")
    implementation("androidx.camera:camera-camera2:1.7.0")
    implementation("androidx.camera:camera-lifecycle:1.7.0")
    implementation("androidx.camera:camera-view:1.7.0")
    api("androidx.appcompat:appcompat:1.8.0")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20260814")
}
