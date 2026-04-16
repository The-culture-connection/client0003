/**
 * Typed analytics entry points — prefer these over calling `trackClientAnalyticsEvent` with literals.
 */

import { ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { trackClientAnalyticsEvent } from "./client";

export const mortarWebAnalytics = {
  pageView(route: string) {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.PAGE_VIEW,
      properties: { route },
    });
  },

  navigationTabSelected(tab_id: string) {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.NAVIGATION_TAB_SELECTED,
      properties: { tab_id },
    });
  },

  curriculumPageViewed(course_id: string) {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.CURRICULUM_PAGE_VIEWED,
      properties: { course_id },
    });
  },

  lessonPlayerOpened(lesson_id: string, course_id?: string) {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.LESSON_PLAYER_OPENED,
      properties: { lesson_id, ...(course_id ? { course_id } : {}) },
    });
  },

  analyticsDashboardViewed() {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.ANALYTICS_DASHBOARD_VIEWED,
      properties: {},
    });
  },

  communityHubViewed() {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.COMMUNITY_HUB_VIEWED,
      properties: {},
    });
  },

  discussionsListViewed() {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.DISCUSSIONS_LIST_VIEWED,
      properties: {},
    });
  },

  dataRoomViewed() {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.DATA_ROOM_VIEWED,
      properties: {},
    });
  },

  uiInteraction(component_id: string, action: string) {
    return trackClientAnalyticsEvent({
      event_name: ANALYTICS_EVENTS.UI_INTERACTION,
      properties: { component_id, action },
    });
  },
};
