import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MagicScryfallAdapter } from '../core/catalog';
import { CsvExporter } from '../core/csv-exporter';
import { CONDITIONS, CatalogCard, Condition, FINISHES, Finish, Session, CardRecord } from '../core/models';
import { SessionRepository } from '../core/session.repository';
import { RecognitionEngine, RecognitionResult } from '../core/recognition';

type View = 'home' | 'setup' | 'capture' | 'search' | 'confirm' | 'inventory' | 'summary';

@Component({
  selector: 'app-workspace',
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatToolbarModule],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  private readonly repository = inject(SessionRepository);
  private readonly catalog = inject(MagicScryfallAdapter);
  private readonly exporter = inject(CsvExporter);
  private readonly recognition = inject(RecognitionEngine);
  @ViewChild('camera') camera?: ElementRef<HTMLVideoElement>;
  readonly conditions = CONDITIONS; readonly finishes = FINISHES;
  readonly view = signal<View>('home'); readonly session = signal<Session | undefined>(undefined);
  readonly records = signal<CardRecord[]>([]); readonly candidates = signal<CatalogCard[]>([]);
  readonly busy = signal(false); readonly message = signal(''); readonly canAcquire = signal(false);
  readonly cameraOpen = signal(false); readonly torchAvailable = signal(false);
  readonly lastRecognition = signal<RecognitionResult | undefined>(undefined);
  readonly recognitionFailed = signal(false);
  private stream?: MediaStream;
  readonly count = computed(() => this.records().length);
  defaults = { condition: 'Near Mint' as Condition, finish: 'Normal' as Finish, storageLocation: '' };
  query = ''; nextPage?: string; selected?: CatalogCard;
  editingId?: string;
  confirmation = { language: 'Unknown', finish: 'Normal' as Finish, condition: 'Near Mint' as Condition, storageLocation: '', useLocationNext: false };

  async ngOnInit(): Promise<void> {
    const stored = await this.repository.current();
    if (stored) { this.session.set(stored.session); this.records.set(stored.records); }
    void this.repository.requestPersistentStorage();
    try { this.canAcquire.set((await fetch('https://api.scryfall.com/cards/random', { signal: AbortSignal.timeout(4000) })).ok); } catch { this.canAcquire.set(false); }
  }
  ngOnDestroy(): void { this.stopCamera(); void this.recognition.destroy(); }
  async create(replace = false): Promise<void> {
    try { const stored = await this.repository.create({ ...this.defaults }, replace); this.session.set(stored.session); this.records.set([]); this.view.set('capture'); this.message.set('Sessione avviata.'); }
    catch (error) { this.message.set(this.error(error)); }
  }
  resume(): void { this.view.set(this.session()?.status === 'terminated' ? 'summary' : 'capture'); }
  async search(loadMore = false): Promise<void> {
    if (!this.query.trim()) return;
    this.busy.set(true); this.message.set('');
    try {
      const result = await this.catalog.manual(this.query.trim(), loadMore ? this.nextPage : undefined);
      this.candidates.set(loadMore ? [...this.candidates(), ...result.cards] : result.cards); this.nextPage = result.nextPage;
    } catch (error) { this.message.set(this.error(error)); } finally { this.busy.set(false); }
  }
  choose(card: CatalogCard): void {
    const session = this.session(); if (!session) return;
    this.selected = card; this.editingId = undefined;
    this.confirmation = { language: card.language || 'Unknown', finish: session.defaults.finish, condition: session.defaults.condition, storageLocation: session.defaults.storageLocation, useLocationNext: false };
    this.view.set('confirm');
  }
  finishCompatible(): boolean { return !!this.selected?.availableFinishes.includes(this.confirmation.finish); }
  async confirm(): Promise<void> {
    const session = this.session();
    if (!session || !this.selected || !this.finishCompatible()) { this.message.set('Scegli una finitura disponibile per questa stampa.'); return; }
    try {
      const existing = this.editingId ? this.records().find((record) => record.id === this.editingId) : undefined;
      const values = { catalog: this.selected, language: this.confirmation.language || 'Unknown', finish: this.confirmation.finish, condition: this.confirmation.condition, storageLocation: this.confirmation.storageLocation.trim() };
      const record = existing ? { ...existing, ...values } : await this.repository.add(session, values);
      if (existing) { await this.repository.update(session, record); this.records.update((records) => records.map((item) => item.id === record.id ? record : item)); }
      else this.records.update((records) => [...records, record]);
      if (this.confirmation.useLocationNext) {
        const updated = { ...session, defaults: { ...session.defaults, storageLocation: record.storageLocation } };
        await this.repository.saveSession(updated); this.session.set(updated);
      }
      this.message.set(existing ? `${record.catalog.name} aggiornata.` : `${record.catalog.name} aggiunta.`); this.query = ''; this.candidates.set([]); this.selected = undefined; this.editingId = undefined; this.view.set('capture');
    } catch (error) { this.message.set(this.error(error)); }
  }
  async remove(record: CardRecord): Promise<void> {
    const session = this.session(); if (!session || !confirm(`Eliminare ${record.catalog.name}?`)) return;
    await this.repository.remove(session, record.id); this.records.update((records) => records.filter((item) => item.id !== record.id));
  }
  edit(record: CardRecord): void {
    this.selected = record.catalog; this.editingId = record.id;
    this.confirmation = { language: record.language, finish: record.finish, condition: record.condition, storageLocation: record.storageLocation, useLocationNext: false };
    this.view.set('confirm');
  }
  async undo(): Promise<void> {
    const record = this.records().at(-1); const session = this.session(); if (!record || !session) return;
    await this.repository.remove(session, record.id); this.records.update((records) => records.slice(0, -1)); this.message.set('Ultima aggiunta annullata.');
  }
  async terminate(): Promise<void> {
    const session = this.session(); if (!session) return;
    try { this.session.set(await this.repository.terminate(session)); this.view.set('summary'); } catch (error) { this.message.set(this.error(error)); }
  }
  download(): void {
    const session = this.session(); if (!session) return;
    try {
      const bytes = this.exporter.serialize(session, this.records());
      const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = this.exporter.filename(session); anchor.click(); URL.revokeObjectURL(url);
    } catch (error) { this.message.set(this.error(error)); }
  }
  newSession(): void { if (confirm('La sessione conservata verrà eliminata. Continuare?')) this.view.set('setup'); }
  async startCamera(): Promise<void> {
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) { this.message.set('La fotocamera richiede HTTPS e un browser compatibile.'); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      this.cameraOpen.set(true);
      const capabilities = this.stream.getVideoTracks()[0]?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      this.torchAvailable.set(!!capabilities?.torch);
      setTimeout(() => { if (this.camera) { this.camera.nativeElement.srcObject = this.stream!; void this.camera.nativeElement.play(); } });
    } catch { this.message.set('Accesso alla fotocamera non disponibile.'); }
  }
  async toggleTorch(enabled: boolean): Promise<void> {
    const track = this.stream?.getVideoTracks()[0]; if (!track || !this.torchAvailable()) return;
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
  }
  async capture(): Promise<void> {
    const video = this.camera?.nativeElement; if (!video?.videoWidth) return;
    this.busy.set(true);
    try {
      const canvas = document.createElement('canvas');
      const targetRatio = 63 / 88; const sourceRatio = video.videoWidth / video.videoHeight;
      const width = sourceRatio > targetRatio ? video.videoHeight * targetRatio : video.videoWidth;
      const height = sourceRatio > targetRatio ? video.videoHeight : video.videoWidth / targetRatio;
      canvas.width = 900; canvas.height = Math.round(900 / targetRatio);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas non disponibile.');
      context.drawImage(video, (video.videoWidth - width) / 2, (video.videoHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
      const quality = this.recognition.quality(context.getImageData(0, 0, canvas.width, canvas.height));
      if (!quality.acceptable && !confirm(`${quality.reasons.join('. ')}. Usare comunque?`)) return;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Acquisizione non riuscita.')), 'image/jpeg', .9));
      const result = await this.recognition.recognize(blob);
      const candidates = await this.catalog.automatic(result.hints);
      const strong = candidates.some((candidate) => candidate.strong);
      this.lastRecognition.set(result); this.recognitionFailed.set(!strong);
      this.candidates.set(candidates); this.query = strong ? result.hints.name ?? '' : ''; this.nextPage = undefined;
      this.stopCamera(); this.view.set('search');
      this.message.set(strong ? '' : 'Testo non riconosciuto.');
    } catch (error) { this.message.set(this.error(error)); } finally { this.busy.set(false); }
  }
  async retryPhoto(): Promise<void> {
    this.lastRecognition.set(undefined); this.recognitionFailed.set(false); this.candidates.set([]); this.query = '';
    this.view.set('capture');
    await this.startCamera();
  }
  skipCard(): void {
    this.lastRecognition.set(undefined); this.recognitionFailed.set(false); this.candidates.set([]); this.query = '';
    this.view.set('capture');
  }
  stopCamera(): void { this.stream?.getTracks().forEach((track) => track.stop()); this.stream = undefined; this.cameraOpen.set(false); }
  private error(error: unknown): string { return error instanceof Error ? error.message : 'Operazione non riuscita.'; }
}
