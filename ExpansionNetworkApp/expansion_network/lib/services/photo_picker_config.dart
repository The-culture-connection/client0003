import 'package:image_picker_android/image_picker_android.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';

/// Routes every `ImagePicker` gallery pick through the **Android Photo Picker**.
///
/// `ImagePickerAndroid.useAndroidPhotoPicker` still defaults to `false`, which leaves the
/// plugin on the legacy `ACTION_GET_CONTENT` path — the path that made the app declare
/// `READ_MEDIA_IMAGES`, and the reason Google Play rejected v3.0.0 under the Photo and Video
/// Permissions policy. The photo picker needs no permission: the user hands the app a single
/// image and the app never sees the rest of the library.
///
/// On devices without the picker (pre-API 30 without the Play services module) the plugin
/// falls back to `ACTION_OPEN_DOCUMENT`, which is also permission-free. On iOS/web the
/// platform instance is not [ImagePickerAndroid] and this is a no-op.
///
/// Call once from `main()` before `runApp`.
void configureImagePicker() {
  final implementation = ImagePickerPlatform.instance;
  if (implementation is ImagePickerAndroid) {
    implementation.useAndroidPhotoPicker = true;
  }
}
