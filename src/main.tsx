import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createTheme, MantineProvider } from "@mantine/core"
import { DatesProvider } from "@mantine/dates"
import { ModalsProvider } from "@mantine/modals"
import { Notifications } from "@mantine/notifications"
import "dayjs/locale/de"

import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import "@mantine/notifications/styles.css"
import "./index.css"
import App from "./App.tsx"

// Template-Blau (#4167c1) liegt nahe an Mantines Indigo-Palette.
const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: 7,
  fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
  defaultRadius: "md",
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: "de" }}>
        <ModalsProvider>
          <Notifications position="bottom-right" />
          <App />
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
