plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "de.pixelbrewery.remotefixture"
    compileSdk = 36
    defaultConfig { applicationId = "de.pixelbrewery.remotefixture"; minSdk = 24; targetSdk = 36; versionCode = 1; versionName = "0.1.0" }
    flavorDimensions += "product"
    productFlavors {
        create("counter") { dimension = "product"; applicationIdSuffix = ".counter"; buildConfigField("String", "REMOTE_KIND", "\"counter\"") }
        create("notes") { dimension = "product"; applicationIdSuffix = ".notes"; buildConfigField("String", "REMOTE_KIND", "\"notes\"") }
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/remote-assets"))
}
kotlin { jvmToolchain(21) }
dependencies { implementation(project(":remote-capacitor")); implementation(project(":capacitor-android")) }
val prepareFixtureAssets = tasks.register<Sync>("prepareFixtureAssets") {
    from(rootProject.file("../dist")) { into("public") }
    from(rootProject.file("../capacitor.config.json"))
    into(layout.buildDirectory.dir("generated/remote-assets"))
}
tasks.named("preBuild").configure { dependsOn(prepareFixtureAssets) }
