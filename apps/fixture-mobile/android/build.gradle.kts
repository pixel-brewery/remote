buildscript {
    repositories { google(); mavenCentral() }
    dependencies {
        // AGP applies built-in Kotlin; this selects its compiler version without applying kotlin-android.
        // https://developer.android.com/build/releases/agp-9-0-0-release-notes#runtime-dependency-on-kgp
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")
    }
}

plugins {
    id("com.android.application") version "9.5.3" apply false
    id("com.android.library") version "9.5.3" apply false
}
