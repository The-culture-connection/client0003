import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class NetworkCircleAvatar extends StatelessWidget {
  const NetworkCircleAvatar({
    required this.imageUrl,
    this.radius = 20,
    super.key,
  });

  final String imageUrl;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final size = radius * 2;
    return ClipOval(
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          width: size,
          height: size,
          color: AppColors.secondary,
        ),
        errorWidget: (_, __, ___) => Container(
          width: size,
          height: size,
          color: AppColors.secondary,
          alignment: Alignment.center,
          child: Icon(Icons.person, size: radius, color: AppColors.mutedForeground),
        ),
      ),
    );
  }
}
