B6: Conversion Timing + Funnel Tracking (TOP PRIORITY)
Auth Funnel
 screen_session_started (login)
 login_submit_attempted
 login_sign_in_succeeded
 login_sign_in_failed
 login_sign_up_succeeded
 login_password_reset_submitted
 login_password_reset_succeeded
Onboarding Funnel
 onboarding_step_viewed
 onboarding_partial_save_succeeded
 onboarding_skip_clicked
 onboarding_final_save_succeeded
 onboarding_completion_viewed
Navigation → Intent
 nav_link_clicked
 dashboard_continue_learning_clicked
 curriculum_course_card_clicked
 course_detail_start_lesson_clicked
Lesson Entry
 screen_session_started (lesson player)
 lesson_player_missing_query_params ❗ (important friction signal)

🔹 B5: Drop-off / Friction (CRITICAL for debugging growth)
 auth_guard_redirect_unauthenticated
 onboarding_gate_redirect_incomplete_profile
 role_gate_redirect_denied
 dashboard_continue_url_invalid ❗ (broken routing issue)
 lesson_player_load_failed
 lesson_player_empty_content_viewed
 lesson_quiz_exhausted_viewed
 shop_add_to_cart_failed
 event_register_failed
 discussion_create_failed
 group_join_failed

🔹 B3 + B4: Course Engagement + Completion
Lesson Behavior
 lesson_slide_next_clicked
 lesson_slide_previous_clicked
 lesson_close_clicked
 lesson_quiz_view_opened
 lesson_quiz_submit_clicked
 lesson_quiz_passed
 lesson_quiz_failed
 lesson_quiz_try_again_clicked
 lesson_survey_submit_clicked
Completion Signals
 lesson_course_completed
 lesson_certificate_created

🔹 B1: Sales / Revenue
Shop Funnel
 screen_session_started (shop)
 shop_filter_changed
 shop_size_changed
 shop_add_to_cart_clicked
 cart_dropdown_toggled
 cart_line_remove_clicked
 cart_continue_to_shop_clicked

🔹 B2: Community Engagement
Community Entry
 screen_session_started (community)
 community_discussion_preview_clicked
 community_start_discussion_clicked
Creation + Interaction
 discussion_create_submit_clicked
 discussion_reply_submit_clicked
 discussion_like_toggled
 mortar_dm_message_sent
 group_message_send_clicked

🔹 B7: Customer Profiles / Behavior Tracking
Passive Behavior (VERY IMPORTANT)
 screen_session_started (all major screens)
 screen_session_ended
 dashboard_passive_time_on_screen
 data_room_file_search_changed
 discussions_search_changed

🔹 Conversion Deepening
 curriculum_continue_clicked
 course_detail_module_expand_toggled
 lesson_quiz_answer_selected
 lesson_survey_field_changed
🔹 Community Depth
 discussion_category_selected
 discussion_draft_next_clicked
 mortar_dm_reply_thread_selected
 group_join_clicked
🔹 Event Participation
 event_register_clicked
 event_unregister_clicked
 community_hero_rsvp_clicked
🔹 Data Room (skill validation behavior)
 data_room_certificate_preview_opened
 data_room_certificate_download_clicked
 data_room_survey_pdf_download_clicked

🔹 Backend + Derived Events
 derived_daily_active_user
 derived_course_progress_pct
 derived_lesson_completion_latency
 derived_cart_abandonment_24h
🔹 Lifecycle + Retention Signals
 onboarding_nudge_sent (already exists backend)
 notification_item_clicked
 notification_mark_read_backend
🔹 Admin + Content Creation (important for scaling platform)
 admin_course_builder_save_clicked
 admin_lesson_deck_publish_clicked
 admin_event_create_submitted
 admin_shop_item_created