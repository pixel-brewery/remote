import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNativeDependencyChange } from './isNativeDependencyChange.mjs';

const gradle = 'libs/remote-capacitor/android/build.gradle.kts';
const swift = 'libs/remote-capacitor/Package.swift';

test('permits Kotlin compiler version updates at the AGP built-in Kotlin classpath owner', () => {
    // Arrange
    const before =
        'buildscript {\n    dependencies {\n        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")\n    }\n}\n';
    const after = before.replace('2.4.21', '3.0.0');
    // Act / Assert
    assert.equal(isNativeDependencyChange(gradle, before, after), true);
});

test('rejects Kotlin classpath artifact replacement and accompanying executable Gradle changes', () => {
    // Arrange
    const before = '    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")\n';
    const after = before.replace('2.4.21', '3.0.0');
    // Act / Assert
    assert.equal(
        isNativeDependencyChange(gradle, before, after.replace('org.jetbrains.kotlin:', 'other:')),
        false,
    );
    assert.equal(
        isNativeDependencyChange(gradle, before, `${after}tasks.register("publishCredentials")\n`),
        false,
    );
    assert.equal(
        isNativeDependencyChange(
            gradle,
            before.replace('kotlin-gradle-plugin:', 'other-plugin:'),
            after.replace('kotlin-gradle-plugin:', 'other-plugin:'),
        ),
        false,
    );
});

test('permits native major versions while preserving plugin and artifact identity', () => {
    // Arrange
    const before =
        'plugins {\n    id("org.jetbrains.kotlin.android") version "2.3.21"\n}\nval ktor = "3.6.2"\nimplementation("io.ktor:ktor-client-cio:3.6.2")\n';
    const after = before.replaceAll('2.3.21', '3.0.0').replaceAll('3.6.2', '4.0.0');
    // Act / Assert
    assert.equal(isNativeDependencyChange(gradle, before, after), true);
    assert.equal(
        isNativeDependencyChange(gradle, before, after.replace('io.ktor:', 'evil:')),
        false,
    );
    assert.equal(
        isNativeDependencyChange(gradle, before, `${after}tasks.register("publishCredentials")\n`),
        false,
    );
});

test('does not treat arbitrary Gradle source or adjacent paths as metadata', () => {
    // Arrange
    const before = 'val command = "1.0.0"\n';
    // Act / Assert
    assert.equal(isNativeDependencyChange(gradle, before, before.replace('1.0.0', '2.0.0')), false);
    assert.equal(
        isNativeDependencyChange(
            'libs/other/build.gradle.kts',
            'val ktor = "3.0.0"',
            'val ktor = "4.0.0"',
        ),
        false,
    );
});

test('permits Swift version updates without changing URLs or runtime configuration', () => {
    // Arrange
    const before = '    .package(url: "https://github.com/apple/swift-nio.git", from: "2.90.0"),\n';
    const after = before.replace('2.90.0', '3.0.0');
    // Act / Assert
    assert.equal(isNativeDependencyChange(swift, before, after), true);
    assert.equal(
        isNativeDependencyChange(swift, before, after.replace('apple/', 'unknown/')),
        false,
    );
    assert.equal(
        isNativeDependencyChange(swift, before, `${after}let command = "execute"\n`),
        false,
    );
});

test('validates Swift lock data without accepting source, credentials or mutable branch pins', () => {
    // Arrange
    const resolved = (state) =>
        JSON.stringify({
            version: 3,
            originHash: 'a'.repeat(64),
            pins: [
                {
                    identity: 'swift-nio',
                    kind: 'remoteSourceControl',
                    location: 'https://github.com/apple/swift-nio.git',
                    state,
                },
            ],
        });
    const before = resolved({ revision: 'a'.repeat(40), version: '2.90.0' });
    const after = resolved({ revision: 'b'.repeat(40), version: '3.0.0' });
    const path = 'libs/remote-capacitor/Package.resolved';
    // Act / Assert
    assert.equal(isNativeDependencyChange(path, before, after), true);
    assert.equal(
        isNativeDependencyChange(
            path,
            before,
            after.replace('github.com', 'user:password@github.com'),
        ),
        false,
    );
    assert.equal(
        isNativeDependencyChange(
            path,
            before,
            resolved({ revision: 'b'.repeat(40), branch: 'main' }),
        ),
        false,
    );
    assert.equal(
        isNativeDependencyChange(path, before, '{"version":3,"pins":[],"command":"execute"}'),
        false,
    );
});
