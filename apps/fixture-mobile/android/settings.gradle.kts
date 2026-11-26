pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = "remote-mobile-fixture"
include(":app", ":remote-capacitor", ":capacitor-android")
project(":remote-capacitor").projectDir = file("../../../libs/remote-capacitor/android")
project(":capacitor-android").projectDir = file("../../../node_modules/@capacitor/android/capacitor")
