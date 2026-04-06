import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Properties

plugins {
    id("com.android.application")
    // START: FlutterFire Configuration
    id("com.google.gms.google-services")
    // END: FlutterFire Configuration
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val androidGradleRoot: File = rootProject.projectDir
val signingPropKeys = listOf("storePassword", "keyPassword", "keyAlias", "storeFile")

/**
 * Decode raw file bytes (UTF-8 / UTF-8 BOM / UTF-16 LE|BE).
 */
fun decodeSigningFileBytes(bytes: ByteArray): String =
    when {
        bytes.size >= 3 &&
            bytes[0] == 0xEF.toByte() &&
            bytes[1] == 0xBB.toByte() &&
            bytes[2] == 0xBF.toByte() -> {
            String(bytes.copyOfRange(3, bytes.size), StandardCharsets.UTF_8)
        }
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xFE.toByte() -> {
            String(bytes.copyOfRange(2, bytes.size), StandardCharsets.UTF_16LE)
        }
        bytes.size >= 2 && bytes[0] == 0xFE.toByte() && bytes[1] == 0xFF.toByte() -> {
            String(bytes.copyOfRange(2, bytes.size), StandardCharsets.UTF_16BE)
        }
        else -> {
            String(bytes, StandardCharsets.UTF_8)
        }
    }

/**
 * Load `key.properties` / `keystore.properties` line-by-line (first `=` splits key/value).
 * Does **not** use [Properties.load], so Windows paths like `...\release\upload-keystore.jks` work:
 * Java's .properties format treats `\u` as a Unicode escape and throws "Malformed \\uxxxx encoding".
 */
fun loadSigningProperties(file: File): Properties {
    val p = Properties()
    if (!file.isFile || file.length() == 0L) {
        return p
    }
    val text = decodeSigningFileBytes(file.readBytes())
    for (rawLine in text.lineSequence()) {
        val line = rawLine.trim()
        if (line.isEmpty() || line.startsWith("#")) continue
        val eq = line.indexOf('=')
        if (eq <= 0) continue
        val key = line.substring(0, eq).trim()
        val value = line.substring(eq + 1).trim()
        if (key.isNotEmpty()) {
            p.setProperty(key, value)
        }
    }
    return p
}

/** Merge key.properties then keystore.properties; later file overrides. Trim property *names* only (fixes stray spaces). */
val mergedSigningProps = Properties()
val contributingSigningFiles = mutableListOf<File>()
for (name in listOf("key.properties", "keystore.properties")) {
    val f = androidGradleRoot.resolve(name)
    if (!f.isFile) continue
    contributingSigningFiles.add(f)
    val chunk = loadSigningProperties(f)
    for (name in chunk.stringPropertyNames()) {
        val kn = name.trim()
        if (kn.isNotEmpty()) {
            chunk.getProperty(name)?.let { value -> mergedSigningProps.setProperty(kn, value) }
        }
    }
}

val hasReleaseKeystore =
    contributingSigningFiles.isNotEmpty() &&
        signingPropKeys.all { key -> mergedSigningProps.getProperty(key)?.isNotBlank() == true }

var keystorePropertiesSourceLabel: String = ""
if (hasReleaseKeystore) {
    keystoreProperties.clear()
    keystoreProperties.putAll(mergedSigningProps)
    keystorePropertiesSourceLabel =
        if (contributingSigningFiles.size == 1) {
            contributingSigningFiles.single().name
        } else {
            contributingSigningFiles.joinToString(" + ") { it.name }
        }
}

/** For tasks that need a path; first contributing file. */
val keystorePropertiesFile: File? = contributingSigningFiles.firstOrNull()

fun requireKeystoreProp(name: String): String {
    val v = keystoreProperties.getProperty(name)?.trim()
    if (v.isNullOrEmpty()) {
        val label = keystorePropertiesSourceLabel.ifEmpty { keystorePropertiesFile?.name ?: "key.properties" }
        throw org.gradle.api.GradleException(
            "android/$label is missing or empty: $name=\n" +
                "Properties keys are case-sensitive. Required: storePassword, keyPassword, keyAlias, storeFile\n" +
                "See android/key.properties.example.",
        )
    }
    return v
}

android {
    namespace = "com.expansionnetwork.expansion_network"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.expansionnetwork.expansion_network"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // Firebase Android SDK / Cloud Functions expect at least API 23.
        minSdk = maxOf(flutter.minSdkVersion, 23)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storePassword = requireKeystoreProp("storePassword")
                keyPassword = requireKeystoreProp("keyPassword")
                keyAlias = requireKeystoreProp("keyAlias")
                storeFile = rootProject.file(requireKeystoreProp("storeFile"))
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasReleaseKeystore) {
                    signingConfigs.getByName("release")
                } else {
                    signingConfigs.getByName("debug")
                }
        }
    }
}

flutter {
    source = "../.."
}

// Fail fast: without signing properties file, release uses debug signing and Play rejects the .aab.
afterEvaluate {
    listOf("bundleRelease", "assembleRelease").forEach { taskName ->
        tasks.findByName(taskName)?.let { task ->
            task.doFirst {
                if (!hasReleaseKeystore) {
                    val partial =
                        listOf("key.properties", "keystore.properties")
                            .map { androidGradleRoot.resolve(it) }
                            .filter { it.isFile }
                    if (partial.isNotEmpty()) {
                        val report =
                            partial.joinToString("\n") { f ->
                                val p = Properties()
                                val chunk = loadSigningProperties(f)
                                for (name in chunk.stringPropertyNames()) {
                                    val kn = name.trim()
                                    if (kn.isNotEmpty()) {
                                        chunk.getProperty(name)?.let { v -> p.setProperty(kn, v) }
                                    }
                                }
                                val missing =
                                    signingPropKeys.filter { p.getProperty(it)?.isNotBlank() != true }
                                val found = p.stringPropertyNames().toSortedSet().joinToString(", ")
                                val size = f.length()
                                val hint =
                                    when {
                                        size == 0L ->
                                            " FILE IS EMPTY (0 bytes) — save the file in your editor (Ctrl+S)."
                                        found.isEmpty() && size > 0 ->
                                            " No keys parsed ($size bytes). Re-save as UTF-8 or UTF-16; check each line is key=value."
                                        else -> ""
                                    }
                                "  ${f.invariantSeparatorsPath}: blank/missing [${missing.joinToString()}]; keys read: [$found]$hint"
                            }
                        throw org.gradle.api.GradleException(
                            "Signing properties incomplete. File must live in android/ (same folder as app/), not android/app/.\n" +
                                "$report\n" +
                                "Exact key names: storePassword, keyPassword, keyAlias, storeFile. See android/key.properties.example.",
                        )
                    }
                    throw org.gradle.api.GradleException(
                        "Missing android/key.properties (or android/keystore.properties) — release builds use the debug key and Google Play will reject them. " +
                            "Copy android/key.properties.example to android/key.properties (or use keystore.properties) and set storeFile, passwords, and keyAlias.",
                    )
                }
                val propsFileName =
                    keystorePropertiesSourceLabel.ifEmpty { keystorePropertiesFile!!.name }
                val rel = keystoreProperties.getProperty("storeFile")
                if (rel.isNullOrBlank()) {
                    throw org.gradle.api.GradleException(
                        "android/$propsFileName must set storeFile= (path relative to the android/ folder, or absolute).",
                    )
                }
                val store = rootProject.file(rel)
                if (!store.isFile) {
                    throw org.gradle.api.GradleException(
                        "storeFile is not a file: ${store.path}. Fix the path in android/$propsFileName or move upload-keystore.jks.",
                    )
                }
            }
        }
    }
}
