import Flutter
import UIKit
import EventKit
import EventKitUI
import Foundation

extension Date {
      init(milliseconds:Double) {
          self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
      }
}

var statusBarStyle = UIApplication.shared.statusBarStyle

/// Walks presented / navigation / tab children so we can present from Flutter's root VC.
private func add2TopViewController(from root: UIViewController) -> UIViewController {
    if let presented = root.presentedViewController {
        return add2TopViewController(from: presented)
    }
    if let nav = root as? UINavigationController, let visible = nav.visibleViewController {
        return add2TopViewController(from: visible)
    }
    if let tab = root as? UITabBarController, let selected = tab.selectedViewController {
        return add2TopViewController(from: selected)
    }
    return root
}

/// `UIApplication.shared.keyWindow` is nil under Flutter; use foreground window scene.
private func add2RootViewControllerForPresentation() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
    let active = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
    guard let scene = active else {
        if let kw = UIApplication.shared.keyWindow, let r = kw.rootViewController {
            return add2TopViewController(from: r)
        }
        return nil
    }
    let window = scene.windows.first { $0.isKeyWindow } ?? scene.windows.first
    guard let root = window?.rootViewController else { return nil }
    return add2TopViewController(from: root)
}

public class Add2CalendarPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "add_2_calendar", binaryMessenger: registrar.messenger())
    let instance = Add2CalendarPlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

 public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
      if call.method == "add2Cal" {
        let args = call.arguments as! [String:Any]

        addEventToCalendar(from: args, completion:{ (success) -> Void in
              if success {
                  result(true)
              } else {
                  result(false)
              }
          })
      }
    }

    private func addEventToCalendar(from args: [String:Any], completion: ((_ success: Bool) -> Void)? = nil) {


        let title = args["title"] as! String
        let description = args["desc"] is NSNull ? nil: args["desc"] as? String
        let location = args["location"] is NSNull ? nil: args["location"] as? String
        let timeZone = args["timeZone"] is NSNull ? nil: TimeZone(identifier: args["timeZone"] as! String)
        let startDate = Date(milliseconds: (args["startDate"] as! Double))
        let endDate = Date(milliseconds: (args["endDate"] as! Double))
        let alarmInterval = args["alarmInterval"] as? Double
        let allDay = args["allDay"] as! Bool
        let url = args["url"] as? String

        let eventStore = EKEventStore()
        let event = createEvent(eventStore: eventStore, alarmInterval: alarmInterval, title: title, description: description, location: location, timeZone: timeZone, startDate: startDate, endDate: endDate, allDay: allDay, url: url, args: args)

        presentCalendarModalToAddEvent(event, eventStore: eventStore, completion: completion)
    }

    private func createEvent(eventStore: EKEventStore, alarmInterval: Double?, title: String, description: String?, location: String?, timeZone: TimeZone?, startDate: Date?, endDate: Date?, allDay: Bool, url: String?, args: [String:Any]) -> EKEvent {
        let event = EKEvent(eventStore: eventStore)
        if let alarm = alarmInterval{
            event.addAlarm(EKAlarm(relativeOffset: alarm*(-1)))
        }
        event.title = title
        event.startDate = startDate
        event.endDate = endDate
        if (timeZone != nil) {
            event.timeZone = timeZone
        }
        if (location != nil) {
            event.location = location
        }
        if (description != nil) {
            event.notes = description
        }
        if let url = url{
            event.url = URL(string: url);
        }
        event.isAllDay = allDay

        if let recurrence = args["recurrence"] as? [String:Any]{
            let interval = recurrence["interval"] as! Int
            let frequency = recurrence["frequency"] as! Int
            let end = recurrence["endDate"] as? Double// Date(milliseconds: (args["startDate"] as! Double))
            let ocurrences = recurrence["ocurrences"] as? Int

            let recurrenceRule = EKRecurrenceRule.init(
                recurrenceWith: EKRecurrenceFrequency(rawValue: frequency)!,
                interval: interval,
                end: ocurrences != nil ? EKRecurrenceEnd.init(occurrenceCount: ocurrences!) : end != nil ? EKRecurrenceEnd.init(end: Date(milliseconds: end!)) : nil
            )
            event.recurrenceRules = [recurrenceRule]
        }

        return event
    }

    private func getAuthorizationStatus() -> EKAuthorizationStatus {
        return EKEventStore.authorizationStatus(for: EKEntityType.event)
    }

    // Show event kit ui to add event to calendar

    func presentCalendarModalToAddEvent(_ event: EKEvent, eventStore: EKEventStore, completion: ((_ success: Bool) -> Void)? = nil) {
        if #available(iOS 17, *) {
            OperationQueue.main.addOperation {
                guard let root = add2RootViewControllerForPresentation() else {
                    completion?(false)
                    return
                }
                self.presentEventCalendarDetailModal(event: event, eventStore: eventStore, from: root)
                completion?(true)
            }
        } else {
            let authStatus = getAuthorizationStatus()
            switch authStatus {
            case .authorized:
                OperationQueue.main.addOperation {
                    guard let root = add2RootViewControllerForPresentation() else {
                        completion?(false)
                        return
                    }
                    self.presentEventCalendarDetailModal(event: event, eventStore: eventStore, from: root)
                    completion?(true)
                }
            case .notDetermined:
                //Auth is not determined
                //We should request access to the calendar
                eventStore.requestAccess(to: .event, completion: { [weak self] (granted, error) in
                    if granted {
                        OperationQueue.main.addOperation {
                            guard let self = self, let root = add2RootViewControllerForPresentation() else {
                                completion?(false)
                                return
                            }
                            self.presentEventCalendarDetailModal(event: event, eventStore: eventStore, from: root)
                            completion?(true)
                        }
                    } else {
                        // Auth denied
                        completion?(false)
                    }
                })
            case .denied, .restricted:
                // Auth denied or restricted
                completion?(false)
            default:
                completion?(false)
            }
        }
    }

    // Present edit event calendar modal

    func presentEventCalendarDetailModal(event: EKEvent, eventStore: EKEventStore, from root: UIViewController) {
        let eventModalVC = EKEventEditViewController()
        eventModalVC.event = event
        eventModalVC.eventStore = eventStore
        eventModalVC.editViewDelegate = self

        if #available(iOS 13, *) {
            eventModalVC.modalPresentationStyle = .fullScreen
        }

        root.present(eventModalVC, animated: true, completion: {
            statusBarStyle = UIApplication.shared.statusBarStyle
            UIApplication.shared.statusBarStyle = UIStatusBarStyle.default
        })
    }
}

extension Add2CalendarPlugin: EKEventEditViewDelegate {

    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true, completion: {
            UIApplication.shared.statusBarStyle = statusBarStyle
        })
    }
}
