# Digital Curriculum Admin Dashboard Reorganization Plan

## Overview
Transform the monolithic 2894-line Admin.tsx into a modular, action-oriented admin suite with student/admin view toggle.

## Current Architecture Problems
1. **Monolithic component** - 2894 lines in single file
2. **No visibility of urgent tasks** - Admin must manually check each tab
3. **No student preview** - Can't easily see student experience
4. **Tab-based navigation** - Hard to prioritize urgent actions
5. **Scattered state management** - 50+ useState hooks in one component

## Proposed Architecture

### File Structure
```
src/app/pages/admin/
├── UnifiedAdminDashboard.tsx          # Main entry with toggle & action items
├── GroupManagement.tsx                 # Groups + member approvals
├── EventManagement.tsx                 # Events + member event approvals
├── AlumniApplications.tsx              # Graduation applications workflow
├── DirectMessages.tsx                  # Student DM inbox
├── ShopManagement.tsx                  # Shop items + inventory
├── CourseManagement.tsx                # Course list (links to builder)
├── AdminRoles.tsx                      # Admin/superAdmin assignment
├── AnalyticsDashboard.tsx              # Already exists as component
├── AppAccessHub.tsx                    # Already exists as component
├── MobileModeration.tsx                # Already exists as component
└── MortarInfo.tsx                      # Already exists as component
```

### 1. UnifiedAdminDashboard.tsx (Main Entry Point)

**Key Features:**
- Admin/Student view toggle (top right)
- Action items section (top priority)
- Quick stats cards
- Admin tools grid (9 cards like current implementation)
- Live activity feed
- Quick actions sidebar

**Action Items Logic:**
```typescript
interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'warning' | 'info';
  count: number;
  path: string;
  icon: LucideIcon;
}

const actionItems: ActionItem[] = [
  {
    id: 'pending-groups',
    title: 'Pending Group Approvals',
    description: 'Members waiting to join closed groups',
    priority: 'urgent',
    count: groups.reduce((sum, g) => sum + (g.PendingMembers?.length || 0), 0),
    path: '/admin/groups',
    icon: Users,
  },
  {
    id: 'pending-events',
    title: 'Events Need Approval',
    description: 'Member-submitted events awaiting review',
    priority: 'urgent',
    count: events.filter(e => e.approval_status === 'pending').length,
    path: '/admin/events',
    icon: Calendar,
  },
  {
    id: 'pending-applications',
    title: 'Alumni Applications',
    description: 'Graduation applications to review',
    priority: 'urgent',
    count: graduationApplications.filter(a => a.status === 'pending').length,
    path: '/admin/alumni-applications',
    icon: GraduationCap,
  },
  {
    id: 'unread-dms',
    title: 'Unread Messages',
    description: 'Student DMs waiting for response',
    priority: 'urgent',
    count: dms.filter(dm => !dm.read).length,
    path: '/admin/messages',
    icon: MessageSquare,
  },
  {
    id: 'low-stock',
    title: 'Low Stock Items',
    description: 'Shop items below threshold',
    priority: 'warning',
    count: shopItems.filter(item => {
      if (isApparelCategory(item.category)) {
        const stocks = SHOP_SIZES.map(s => item.sizeStocks?.[s] || 0);
        return stocks.some(q => q > 0 && q <= item.lowStockThreshold);
      }
      return item.stockQuantity > 0 && item.stockQuantity <= item.lowStockThreshold;
    }).length,
    path: '/admin/shop',
    icon: ShoppingBag,
  },
  {
    id: 'out-of-stock',
    title: 'Out of Stock Items',
    description: 'Shop items completely sold out',
    priority: 'urgent',
    count: shopItems.filter(item => {
      if (isApparelCategory(item.category)) {
        const stocks = SHOP_SIZES.map(s => item.sizeStocks?.[s] || 0);
        return stocks.every(q => q <= 0);
      }
      return item.stockQuantity <= 0;
    }).length,
    path: '/admin/shop',
    icon: AlertTriangle,
  },
  {
    id: 'accepted-not-admitted',
    title: 'Applications Ready to Admit',
    description: 'Accepted applications not yet upgraded to alumni role',
    priority: 'warning',
    count: graduationApplications.filter(a => 
      a.status === 'accepted' && !admissionStatus[a.userId]
    ).length,
    path: '/admin/alumni-applications',
    icon: UserCheck,
  },
  {
    id: 'draft-courses',
    title: 'Draft Courses',
    description: 'Courses not yet published',
    priority: 'info',
    count: courses.filter(c => c.status === 'draft').length,
    path: '/admin/courses',
    icon: BookOpen,
  },
];

// Filter and sort by priority
const activeActionItems = actionItems
  .filter(item => item.count > 0)
  .sort((a, b) => {
    const priorityOrder = { urgent: 0, warning: 1, info: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
```

**UI Layout:**
```tsx
<div className="p-6 max-w-[1600px] mx-auto">
  {/* Header with Toggle */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Crown className="w-8 h-8 text-accent" />
        Admin Command Center
      </h1>
      <p className="text-sm text-muted-foreground">
        Manage your entire platform from this central hub
      </p>
    </div>
    
    {/* Admin/Student Toggle */}
    <div className="flex items-center gap-2 p-1 bg-card border border-border rounded-lg">
      <Button
        size="sm"
        variant={viewMode === "admin" ? "default" : "ghost"}
        onClick={() => setViewMode("admin")}
        className={viewMode === "admin" ? "bg-accent text-accent-foreground" : ""}
      >
        <Crown className="w-4 h-4 mr-2" />
        Admin View
      </Button>
      <Button
        size="sm"
        variant={viewMode === "student" ? "default" : "ghost"}
        onClick={() => setViewMode("student")}
        className={viewMode === "student" ? "bg-accent text-accent-foreground" : ""}
      >
        <Users className="w-4 h-4 mr-2" />
        Student View
      </Button>
    </div>
  </div>

  {viewMode === "admin" ? (
    <>
      {/* Action Items Section */}
      {activeActionItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Action Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeActionItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`p-4 cursor-pointer border-l-4 ${
                  item.priority === 'urgent'
                    ? 'border-l-red-500 bg-red-500/5 hover:bg-red-500/10'
                    : item.priority === 'warning'
                    ? 'border-l-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10'
                    : 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <item.icon className={`w-5 h-5 mt-1 ${
                      item.priority === 'urgent'
                        ? 'text-red-500'
                        : item.priority === 'warning'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                    }`} />
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Badge className={`ml-2 ${
                    item.priority === 'urgent'
                      ? 'bg-red-500 text-white'
                      : item.priority === 'warning'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {item.count}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {/* ... existing quick stats implementation ... */}

      {/* Admin Tools Grid */}
      {/* ... existing admin tools grid ... */}
    </>
  ) : (
    <StudentDashboardPreview />
  )}
</div>
```

### 2. Routes Configuration

Update `src/app/routes.tsx`:
```tsx
// Admin routes
{ path: "admin", Component: UnifiedAdminDashboard },
{ path: "admin/groups", Component: GroupManagement },
{ path: "admin/events", Component: EventManagement },
{ path: "admin/alumni-applications", Component: AlumniApplications },
{ path: "admin/messages", Component: DirectMessages },
{ path: "admin/shop", Component: ShopManagement },
{ path: "admin/courses", Component: CourseManagement },
{ path: "admin/roles", Component: AdminRoles },
{ path: "admin/analytics", Component: AnalyticsDashboard },
{ path: "admin/app-access", Component: AppAccessHub },
{ path: "admin/mobile-moderation", Component: MobileModeration },
{ path: "admin/mortar-info", Component: MortarInfo },
```

### 3. Extract Each Tab to Dedicated Component

#### Example: GroupManagement.tsx
```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Users, CheckCircle2, XCircle, Plus, ArrowLeft } from "lucide-react";
import { getGroups, createGroup, approveMember, rejectMember } from "../../lib/firebase/groups";
import type { Group } from "../../types";

export function GroupManagement() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create group state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupStatus, setNewGroupStatus] = useState<"Open" | "Closed">("Open");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroups();
      setGroups(data);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createGroup(newGroupName.trim(), newGroupStatus);
      setNewGroupName("");
      setNewGroupStatus("Open");
      await loadGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // ... rest of the existing groups tab logic ...

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Group Management</h1>
        <p className="text-muted-foreground">
          Create groups and manage member approvals
        </p>
      </div>

      {/* Rest of groups UI from current Admin.tsx groups tab */}
    </div>
  );
}
```

### 4. Shared State Management

Create a centralized admin context to avoid prop drilling:

#### src/app/contexts/AdminContext.tsx
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  getGroups,
  loadDirectMessages,
  getAllEventsForAdmin,
  getGraduationApplications,
  getAllCourses,
} from "../lib/firebase";
import type { Group, DirectMessage, Event, GraduationApplication, Course, ShopItem } from "../types";

interface AdminContextType {
  groups: Group[];
  dms: DirectMessage[];
  events: Event[];
  graduationApplications: GraduationApplication[];
  courses: Course[];
  shopItems: ShopItem[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dms, setDms] = useState<DirectMessage[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [graduationApplications, setGraduationApplications] = useState<GraduationApplication[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, dmsData, eventsData, applicationsData, coursesData] = await Promise.all([
        getGroups(),
        loadDirectMessages(),
        getAllEventsForAdmin(),
        getGraduationApplications(),
        getAllCourses(),
      ]);
      setGroups(groupsData);
      setDms(dmsData);
      setEvents(eventsData);
      setGraduationApplications(applicationsData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AdminContext.Provider
      value={{
        groups,
        dms,
        events,
        graduationApplications,
        courses,
        shopItems,
        loading,
        refresh: loadData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
```

Wrap admin routes in the provider in routes.tsx.

### 5. Migration Strategy

**Phase 1: Create New Structure (Don't Break Existing)**
1. Create new `UnifiedAdminDashboard.tsx` at `/admin` route
2. Keep old `Admin.tsx` at `/admin/legacy` for fallback
3. Create modular components but don't require them yet

**Phase 2: Extract Components One by One**
1. Start with simplest: `AdminRoles.tsx` (already mostly isolated logic)
2. Then `DirectMessages.tsx`
3. Then `ShopManagement.tsx`
4. Continue with remaining tabs

**Phase 3: Implement Action Items**
1. Add action items calculation to `UnifiedAdminDashboard`
2. Add notification badges to admin tool cards
3. Test with real data

**Phase 4: Add Student View Toggle**
1. Import existing student dashboard component
2. Add toggle UI
3. Test switching between views

**Phase 5: Deprecate Legacy**
1. Redirect `/admin/legacy` to `/admin`
2. Remove old `Admin.tsx`

## Implementation Checklist

### Immediate (Week 1)
- [ ] Create `UnifiedAdminDashboard.tsx` with action items logic
- [ ] Add admin/student toggle to UnifiedAdminDashboard
- [ ] Create `AdminContext` for shared state
- [ ] Extract `AdminRoles.tsx` (simplest component)
- [ ] Extract `DirectMessages.tsx`

### Short-term (Week 2-3)
- [ ] Extract `GroupManagement.tsx`
- [ ] Extract `EventManagement.tsx`
- [ ] Extract `AlumniApplications.tsx`
- [ ] Extract `ShopManagement.tsx`
- [ ] Extract `CourseManagement.tsx`

### Medium-term (Week 4)
- [ ] Add notification badges to admin tool cards
- [ ] Implement real-time updates for action items
- [ ] Add bell icon with total action items count in header
- [ ] Polish student view preview

### Polish (Week 5)
- [ ] Add keyboard shortcuts (e.g., `Cmd+K` for quick action search)
- [ ] Add "Recently Viewed" section
- [ ] Add breadcrumb navigation
- [ ] Performance optimization (lazy load tabs, virtualize lists)

## Key Benefits

1. **Visibility** - Urgent tasks surface automatically, no manual tab checking
2. **Modularity** - Each component is focused, maintainable, testable
3. **Flexibility** - Student preview helps admins understand UX
4. **Scalability** - Easy to add new admin tools without bloating main file
5. **Performance** - Code-split components, lazy load when needed
6. **Developer Experience** - Much easier to find and modify specific features

## Technical Notes

### Firebase/Supabase Difference
- Your app uses Firebase/Firestore
- The admin suite I built uses Supabase (mock data)
- **Action**: Create Firebase service functions in `src/lib/firebase/` mirroring the structure I used
- Keep your existing Firebase functions, just organize them better

### Existing Components to Reuse
You already have these as separate components - just wire them into the new structure:
- `AnalyticsDashboardPanel.tsx` ✅
- `AppAccessHubPanel.tsx` ✅
- `MobileModerationPanel.tsx` ✅
- `MortarInfoAdminPanel.tsx` ✅

### Data Flow Pattern
```
UnifiedAdminDashboard (action items calculation)
  ↓
AdminProvider (shared state)
  ↓
Individual Components (groups, events, etc.)
  ↓
Firebase Services (getGroups, getEvents, etc.)
```

## Example Action Item Notifications

### In UnifiedAdminDashboard:
```tsx
const adminTools = [
  {
    icon: Users,
    title: "Group Management",
    path: "/admin/groups",
    // Add notification badge
    notifications: groups.reduce((sum, g) => sum + (g.PendingMembers?.length || 0), 0),
  },
  {
    icon: Calendar,
    title: "Event Management",
    path: "/admin/events",
    notifications: events.filter(e => e.approval_status === 'pending').length,
  },
  // ... etc
];

// In the card rendering:
<Card className="relative">
  {tool.notifications > 0 && (
    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
      {tool.notifications}
    </Badge>
  )}
  {/* ... rest of card ... */}
</Card>
```

## Questions to Consider

1. **Do you want to keep all 11 tabs** or consolidate some? (e.g., merge "Mortar Info" into a settings page)
2. **Real-time updates** - Should action items update live or require refresh?
3. **Permissions** - Do different admin roles see different action items?
4. **Mobile admin** - Should this work on mobile or desktop-only?
5. **Notifications** - Email/push notifications for urgent items?

## Next Steps

Would you like me to:
1. **Start implementing** - Create the UnifiedAdminDashboard.tsx with action items
2. **Extract a component** - Pick one tab to extract as a proof of concept
3. **Create Firebase services** - Organize your existing Firebase code
4. **Something else** - Let me know what would be most helpful
