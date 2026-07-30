// App-Shell mit Header nach dem Mantine-UI-Beispiel "HeaderTabs":
// obere Zeile mit Logo und Nutzer-Menü, darunter Outline-Tabs als Navigation.
import { useEffect, useMemo, useState } from "react"
import {
  ActionIcon, Burger, Center, Container, Divider, Drawer, Group, Loader, Menu, ScrollArea, Tabs, Text, UnstyledButton,
  useComputedColorScheme, useMantineColorScheme,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import cx from "clsx"
import { ChevronDownIcon, LayersIcon, LogOutIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react"

import { createBackend, type EpicRecord, type Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { AdminView } from "@/components/admin-view"
import { EpicList } from "@/components/epic-list"
import { LoginView } from "@/components/login-view"
import { OkrsView } from "@/components/okrs-view"
import { ProfileView } from "@/components/profile-view"
import { UserAvatar } from "@/components/user-avatar"
import { Wizard } from "@/components/wizard/wizard"
import classes from "./components/header-tabs.module.css"

type View = { name: "list" } | { name: "okrs" } | { name: "admin" } | { name: "profile" } | { name: "wizard"; epic: EpicRecord | null }

export function App() {
  const backend = useMemo(() => createBackend(), [])
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<View>({ name: "list" })
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false)
  const [userMenuOpened, setUserMenuOpened] = useState(false)
  const { setColorScheme } = useMantineColorScheme()
  const colorScheme = useComputedColorScheme("light")

  useEffect(() => {
    backend
      .restoreSession()
      .then(p => setProfile(p?.approved ? p : null))
      .catch(() => setProfile(null))
      .finally(() => setBooting(false))
  }, [backend])

  async function openEpic(id: string) {
    try {
      const epic = await backend.getEpic(id)
      setView({ name: "wizard", epic })
    } catch (e) {
      toast.error("Öffnen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function logout() {
    await backend.signOut()
    setProfile(null)
    setView({ name: "list" })
  }

  if (booting) {
    return (
      <Center mih="100svh">
        <Loader />
      </Center>
    )
  }

  if (!profile) {
    return <LoginView backend={backend} onLogin={setProfile} />
  }

  const tabs = [
    { value: "list", label: "Epics" },
    { value: "okrs", label: "OKRs" },
    ...(profile.role === "admin" ? [{ value: "admin", label: "Admin" }] : []),
  ]
  const activeTab = view.name === "list" || view.name === "okrs" || view.name === "admin" ? view.name : null

  function goTo(tab: string | null) {
    if (tab === "list") setView({ name: "list" })
    if (tab === "okrs") setView({ name: "okrs" })
    if (tab === "admin") setView({ name: "admin" })
    closeDrawer()
  }

  return (
    <>
      <div className={classes.header}>
        <Container className={classes.mainSection} size="xl">
          <Group justify="space-between">
            <UnstyledButton onClick={() => setView({ name: "list" })}>
              <Group gap={8}>
                <LayersIcon size={22} color="var(--mantine-color-indigo-7)" />
                <Text fw={700}>Ops Epic Maker</Text>
              </Group>
            </UnstyledButton>

            <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="xs" size="sm" aria-label="Navigation umschalten" />

            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={colorScheme === "dark" ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
                onClick={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
              >
                {colorScheme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
              </ActionIcon>

              <Menu
              width={220}
              position="bottom-end"
              transitionProps={{ transition: "pop-top-right" }}
              onClose={() => setUserMenuOpened(false)}
              onOpen={() => setUserMenuOpened(true)}
              withinPortal
            >
              <Menu.Target>
                <UnstyledButton className={cx(classes.user, { [classes.userActive]: userMenuOpened })}>
                  <Group gap={7}>
                    <UserAvatar name={profile.display_name} src={profile.avatar_url} size={20} />
                    <Text fw={500} size="sm" lh={1} mr={3}>
                      {profile.display_name}
                    </Text>
                    <ChevronDownIcon size={12} strokeWidth={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Einstellungen</Menu.Label>
                <Menu.Item leftSection={<SettingsIcon size={16} strokeWidth={1.5} />} onClick={() => setView({ name: "profile" })}>
                  Profil-Einstellungen
                </Menu.Item>
                <Menu.Item leftSection={<LogOutIcon size={16} strokeWidth={1.5} />} onClick={logout}>
                  Abmelden
                </Menu.Item>
              </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Container>
        <Container size="xl">
          <Tabs
            value={activeTab}
            onChange={goTo}
            variant="outline"
            visibleFrom="xs"
            classNames={{
              root: classes.tabs,
              list: classes.tabsList,
              tab: classes.tab,
            }}
          >
            <Tabs.List>
              {tabs.map(tab => (
                <Tabs.Tab value={tab.value} key={tab.value}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Container>

        <Drawer opened={drawerOpened} onClose={closeDrawer} size="100%" padding="md" title="Navigation" hiddenFrom="xs" zIndex={1000000}>
          <ScrollArea h="calc(100vh - 80px)" mx="-md">
            <Divider my="sm" />
            {tabs.map(tab => (
              <button type="button" key={tab.value} className={classes.drawerLink} onClick={() => goTo(tab.value)}>
                {tab.label}
              </button>
            ))}
          </ScrollArea>
        </Drawer>
      </div>

      <Container size={view.name === "wizard" || view.name === "list" ? "xl" : "md"} py="lg">
        {view.name === "list" && (
          <EpicList
            backend={backend}
            profile={profile}
            onOpen={openEpic}
            onNew={() => setView({ name: "wizard", epic: null })}
          />
        )}
        {view.name === "okrs" && <OkrsView backend={backend} profile={profile} />}
        {view.name === "admin" && profile.role === "admin" && <AdminView backend={backend} profile={profile} />}
        {view.name === "profile" && <ProfileView backend={backend} profile={profile} onProfileChange={setProfile} />}
        {view.name === "wizard" && (
          <Wizard
            key={view.epic?.id ?? "new"}
            backend={backend}
            profile={profile}
            epic={view.epic}
            onBack={() => setView({ name: "list" })}
          />
        )}
      </Container>
    </>
  )
}

export default App
