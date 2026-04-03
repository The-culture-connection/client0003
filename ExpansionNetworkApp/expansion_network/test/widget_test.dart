import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:expansion_network/screens/landing_screen.dart';

void main() {
  testWidgets('Landing page shows title', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: LandingScreen()));
    expect(find.text('Expansion Network'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
