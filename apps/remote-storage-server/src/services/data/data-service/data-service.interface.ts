/**
 * Common interface used for all data stores.
 */
import { Actor } from '../../../entities/entities.interface';

export interface DataService {
  /**
   * Get a value
   * @param key
   */
  get<T>(key: string): Promise<T>

  /**
   * Set a value by key
   * @param key
   * @param value
   */
  set(key: string, value: any): Promise<void>

  /**
   * Delete a value by key
   * @param key
   */
  delete(key: string): Promise<void>

  /**
   * List all keys for a given actor (instanceId + userId)
   */
  listKeysForActor(actor: Actor): Promise<string[]>;
}
