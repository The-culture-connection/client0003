import 'dart:async';

import '../analytics/expansion_analytics.dart';

/// Every analytics event the Conference app emits, in one place.
///
/// `conference_id` is **not** passed here — [AnalyticsService] stamps it on
/// every event as a top-level field while a conference is open, so the admin
/// dashboard can scope a query to one conference. See
/// `AnalyticsEventSchema.buildAndValidate`.
///
/// Naming: `conference_<area>_<past_tense_verb>`. The schema enforces
/// snake_case (`^[a-z][a-z0-9_]*$`), so keep to that.
abstract final class ConferenceAnalytics {
  ConferenceAnalytics._();

  // --- Access ---

  static Future<void> gateViewed() =>
      _log('conference_gate_viewed', screen: 'conference_gate');

  /// [success] false records a rejected code; [failureReason] is a short slug.
  static Future<void> codeRedeemed({
    required bool success,
    String? failureReason,
  }) =>
      _log('conference_code_redeemed', screen: 'conference_gate', extra: {
        'success': success,
        if (failureReason != null) 'failure_reason': failureReason,
      });

  static Future<void> entered() =>
      _log('conference_entered', screen: 'conference_lobby');

  // --- Check-in ---

  static Future<void> checkedIn({
    required bool alreadyToday,
    int? todayCount,
  }) =>
      _log('conference_checked_in', screen: 'conference_lobby', extra: {
        'already_today': alreadyToday,
        if (todayCount != null) 'today_count': todayCount,
      });

  // --- Sessions & schedule ---

  static Future<void> scheduleViewed() =>
      _log('conference_schedule_viewed', screen: 'conference_schedule');

  static Future<void> sessionViewed({
    required String sessionId,
    String? title,
  }) =>
      _log('conference_session_viewed',
          entityId: sessionId,
          screen: 'conference_session_detail',
          extra: {if (title != null) 'title': title});

  static Future<void> sessionRsvpChanged({
    required String sessionId,
    required bool going,
  }) =>
      _log('conference_session_rsvp_changed',
          entityId: sessionId,
          screen: 'conference_session_detail',
          extra: {'going': going});

  static Future<void> sessionSaved({
    required String sessionId,
    required bool saved,
  }) =>
      _log('conference_session_saved',
          entityId: sessionId,
          screen: 'conference_session_detail',
          extra: {'saved': saved});

  static Future<void> sessionChatMessageSent({
    required String sessionId,
    required int bodyLength,
  }) =>
      _log('conference_session_chat_message_sent',
          entityId: sessionId,
          screen: 'conference_session_chat',
          extra: {'body_length': bodyLength});

  // --- Sponsors ---

  static Future<void> sponsorsViewed() =>
      _log('conference_sponsors_viewed', screen: 'conference_sponsors');

  static Future<void> sponsorViewed({
    required String sponsorId,
    String? name,
  }) =>
      _log('conference_sponsor_viewed',
          entityId: sponsorId,
          screen: 'conference_sponsor_detail',
          extra: {if (name != null) 'name': name});

  /// Booth QR scanned at the sponsor's stand.
  ///
  /// Distinct from [sponsorViewed]: a scan is evidence the attendee was
  /// physically at the booth, which is what the `booths_scanned` mission metric
  /// counts. Page views keep their own metric.
  static Future<void> sponsorScanned({
    required String sponsorId,
    String? name,
  }) =>
      _log('conference_sponsor_scanned',
          entityId: sponsorId,
          screen: 'conference_booth_scan',
          extra: {if (name != null) 'name': name});

  /// [linkKind] e.g. `website`, `email`, `booth`.
  static Future<void> sponsorLinkClicked({
    required String sponsorId,
    required String linkKind,
  }) =>
      _log('conference_sponsor_link_clicked',
          entityId: sponsorId,
          screen: 'conference_sponsor_detail',
          extra: {'link_kind': linkKind});

  // --- Map ---

  static Future<void> mapViewed({String? floorId}) =>
      _log('conference_map_viewed',
          screen: 'conference_map',
          extra: {if (floorId != null) 'floor_id': floorId});

  static Future<void> mapRoomSelected({
    required String roomId,
    String? floorId,
  }) =>
      _log('conference_map_room_selected',
          entityId: roomId,
          screen: 'conference_map',
          extra: {if (floorId != null) 'floor_id': floorId});

  // --- Networking ---

  static Future<void> networkingViewed() =>
      _log('conference_networking_viewed', screen: 'conference_networking');

  static Future<void> networkingSwiped({
    required String targetUid,
    required bool liked,
  }) =>
      _log('conference_networking_swiped',
          entityId: targetUid,
          screen: 'conference_networking',
          extra: {'liked': liked});

  static Future<void> networkingMatched({required String targetUid}) =>
      _log('conference_networking_matched',
          entityId: targetUid, screen: 'conference_networking');

  static Future<void> connectionsViewed() =>
      _log('conference_connections_viewed', screen: 'conference_connections');

  /// A right-swipe made from the "waiting on you" list rather than the deck.
  static Future<void> connectionsLikedBack({required String targetUid}) =>
      _log('conference_connections_liked_back',
          entityId: targetUid, screen: 'conference_connections');

  static Future<void> networkingToggled({required bool enabled}) =>
      _log('conference_networking_toggled',
          screen: 'conference_networking', extra: {'enabled': enabled});

  // --- QR member card ---

  static Future<void> cardShown() =>
      _log('conference_card_shown', screen: 'member_card');

  static Future<void> cardShared() =>
      _log('conference_card_shared', screen: 'member_card');

  /// [result] is `ok`, `self`, or `invalid` — so a scan that went nowhere is
  /// still recorded, which is what makes the funnel readable.
  static Future<void> cardScanned({
    required String result,
    String? scannedUid,
  }) =>
      _log('conference_card_scanned',
          entityId: scannedUid,
          screen: 'member_card_scan',
          extra: {'result': result});

  // --- Community Hub ---

  static Future<void> communityViewed() =>
      _log('conference_community_viewed', screen: 'conference_community');

  static Future<void> communityPostCreated({
    required int bodyLength,
    String? tag,
  }) =>
      _log('conference_community_post_created',
          screen: 'conference_community_compose',
          extra: {
            'body_length': bodyLength,
            'has_tag': tag != null,
            if (tag != null) 'tag': tag,
          });

  static Future<void> communityPostOpened({required String postId}) =>
      _log('conference_community_post_opened',
          entityId: postId, screen: 'conference_community_post');

  static Future<void> communityReplyCreated({
    required String postId,
    required int bodyLength,
  }) =>
      _log('conference_community_reply_created',
          entityId: postId,
          screen: 'conference_community_post',
          extra: {'body_length': bodyLength});

  /// [targetType] is `post` or `reply`.
  static Future<void> communityContentReported({
    required String targetType,
    required String authorId,
  }) =>
      _log('conference_community_content_reported',
          entityId: authorId,
          screen: 'conference_community',
          extra: {'target_type': targetType});

  static Future<void> communityContentDeleted({
    required String targetType,
    required String targetId,
  }) =>
      _log('conference_community_content_deleted',
          entityId: targetId,
          screen: 'conference_community',
          extra: {'target_type': targetType});

  /// Analytics must never break a user action, so every call is fire-and-forget
  /// and swallows its own errors.
  static Future<void> _log(
    String name, {
    String? entityId,
    String? screen,
    Map<String, Object?> extra = const {},
  }) async {
    try {
      await ExpansionAnalytics.log(
        name,
        entityId: entityId,
        sourceScreen: screen,
        extra: extra,
      );
    } catch (_) {
      // Swallowed by design.
    }
  }
}

/// Fire-and-forget helper so call sites read as one line.
void logConferenceEvent(Future<void> Function() emit) => unawaited(emit());
