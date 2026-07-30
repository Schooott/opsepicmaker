// Dünner Wrapper um Mantine Notifications mit toast-artiger API,
// damit die Aufrufstellen kompakt bleiben.
import { notifications } from "@mantine/notifications"

export const toast = {
  success(message: string) {
    notifications.show({ message, color: "teal" })
  },
  error(message: string) {
    notifications.show({ message, color: "red", autoClose: 6000 })
  },
}
