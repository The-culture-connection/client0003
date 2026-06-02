import 'package:cloud_functions/cloud_functions.dart';
import 'package:expansion_network/analytics/expansion_analytics.dart';
import 'package:expansion_network/utils/safe_launch_url.dart';
import 'package:flutter/material.dart';

/// Stripe Checkout for Expansion mobile (paid events).
class StripeCheckoutService {
  StripeCheckoutService({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<void> checkoutEventTicket({
    required BuildContext context,
    required String eventId,
    String eventCollection = 'events_mobile',
  }) async {
    await ExpansionAnalytics.log(
      'payment_event_ticket_clicked',
      entityId: eventId,
      sourceScreen: 'event_detail',
      extra: {'event_collection': eventCollection},
    );

    final callable = _functions.httpsCallable('createStripeCheckoutSession');
    final result = await callable.call<Map<String, dynamic>>({
      'purchase_type': 'event',
      'event_id': eventId,
      'event_collection': eventCollection,
      'client_platform': Theme.of(context).platform == TargetPlatform.iOS ? 'ios' : 'android',
    });

    final data = Map<String, dynamic>.from(result.data as Map);
    final url = data['checkout_url'] as String?;
    final orderId = data['order_id']?.toString();
    if (url == null || url.isEmpty) {
      throw Exception('Checkout URL missing');
    }

    await ExpansionAnalytics.log(
      'payment_checkout_redirected',
      entityId: eventId,
      sourceScreen: 'event_detail',
      extra: {'order_id': orderId},
    );

    final uri = Uri.parse(url);
    final ok = await safeLaunchExternalUrl(
      uri,
      messengerContext: context,
      userFailureMessage: 'Could not open Stripe checkout',
    );
    if (!ok) {
      throw Exception('Could not open checkout');
    }
  }
}
