pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = "remote-capacitor"
include(":capacitor-android")
project(":capacitor-android").projectDir = file(System.getenv("CAPACITOR_ANDROID_DIR") ?: "../../../node_modules/@capacitor/android/capacitor")
