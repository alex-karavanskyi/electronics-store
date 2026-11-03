export type NotificationResult = 'sent' | 'deferred' | 'failed' | 'skipped'

export interface ProductNotifications {
  sendProductNotification(id: string): Promise<NotificationResult>
  processProductNotifications(): Promise<{ processed: number }>
  retry(id: string): Promise<NotificationResult>
}
