"use client";

import {
  ChevronsUpDown,
  CreditCard,
  Keyboard,
  LifeBuoy,
  Link2,
  LogOut,
  Mail,
  MessageSquare,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/motion/dropdown-menu";

export function DropdownMenuPreview() {
  const [statusBar, setStatusBar] = useState(true);
  const [activity, setActivity] = useState(false);
  const [theme, setTheme] = useState("system");
  const [last, setLast] = useState<string | null>(null);

  const pick = (label: string) => () => setLast(label);

  return (
    <div className="flex min-h-[380px] w-full flex-col items-center justify-start gap-3 pt-10">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-border bg-card pl-1.5 pr-3 text-left text-sm text-foreground outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-border-strong"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
              KA
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-medium">kara</span>
              <span className="text-xs text-muted-foreground">Pro plan</span>
            </span>
            <ChevronsUpDown
              aria-hidden="true"
              className="ml-3 size-4 text-muted-foreground"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuItem
            icon={<User />}
            shortcut="⇧⌘P"
            onSelect={pick("Profile")}
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<CreditCard />}
            shortcut="⌘B"
            onSelect={pick("Billing")}
          >
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<Settings />}
            shortcut="⌘,"
            onSelect={pick("Settings")}
          >
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Keyboard />} disabled>
            Keyboard shortcuts
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={<UserPlus />}>
              Invite users
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem icon={<Mail />} onSelect={pick("Email invite")}>
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<MessageSquare />}
                onSelect={pick("Message invite")}
              >
                Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={<Link2 />} onSelect={pick("Invite link")}>
                More…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem icon={<LifeBuoy />} onSelect={pick("Support")}>
            Support
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={statusBar}
            onCheckedChange={setStatusBar}
          >
            Status bar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={activity}
            onCheckedChange={setActivity}
          >
            Activity panel
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            ariaLabel="Theme"
            value={theme}
            onValueChange={setTheme}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            icon={<LogOut />}
            variant="destructive"
            shortcut="⇧⌘Q"
            onSelect={pick("Log out")}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <p aria-live="polite" className="h-4 text-xs text-muted-foreground">
        {last ? `Selected: ${last}` : `Theme: ${theme}`}
      </p>
    </div>
  );
}
