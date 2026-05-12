/**
 * cleanup-tracker.ts
 * Rastrea los pagos y tokens creados durante las pruebas para limpiarlos automáticamente
 */

class CleanupTracker {
  private createdPaymentIds: Set<string> = new Set();
  private createdTokenIds: Set<string> = new Set();

  /**
   * Registra un payment ID para limpieza posterior
   */
  trackPayment(id: string): void {
    this.createdPaymentIds.add(id);
  }

  /**
   * Registra un token ID para limpieza posterior
   */
  trackToken(id: string): void {
    this.createdTokenIds.add(id);
  }

  /**
   * Obtiene todos los IDs de pagos rastreados
   */
  getTrackedPayments(): string[] {
    return Array.from(this.createdPaymentIds);
  }

  /**
   * Obtiene todos los IDs de tokens rastreados
   */
  getTrackedTokens(): string[] {
    return Array.from(this.createdTokenIds);
  }

  /**
   * Limpia un payment específico de la lista de rastreo
   */
  removePayment(id: string): void {
    this.createdPaymentIds.delete(id);
  }

  /**
   * Limpia un token específico de la lista de rastreo
   */
  removeToken(id: string): void {
    this.createdTokenIds.delete(id);
  }

  /**
   * Limpia todos los pagos y tokens rastreados
   */
  clearAll(): void {
    this.createdPaymentIds.clear();
    this.createdTokenIds.clear();
  }

  /**
   * Obtiene la cantidad total de items rastreados
   */
  count(): number {
    return this.createdPaymentIds.size + this.createdTokenIds.size;
  }
}

// Instancia global compartida entre todos los tests
export const cleanupTracker = new CleanupTracker();
