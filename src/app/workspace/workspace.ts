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
import { CONDITIONS, CatalogCard, Condition, FINISHES, Finish, Session, CardRecord, IdentityCandidate } from '../core/models';
import { SessionRepository } from '../core/session.repository';
import { RecognitionEngine, RecognitionPhase, RecognitionResult } from '../core/recognition';

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
  @ViewChild('titleGuide') titleGuide?: ElementRef<HTMLDivElement>;
  readonly conditions = CONDITIONS; readonly finishes = FINISHES;
  readonly view = signal<View>('home'); readonly session = signal<Session | undefined>(undefined);
  readonly records = signal<CardRecord[]>([]); readonly candidates = signal<CatalogCard[]>([]);
  readonly identityCandidates = signal<IdentityCandidate[]>([]);
  readonly busy = signal(false); readonly message = signal(''); readonly canAcquire = signal(false);
  readonly cameraOpen = signal(false); readonly torchAvailable = signal(false);
  readonly lastRecognition = signal<RecognitionResult | undefined>(undefined);
  readonly recognitionFailed = signal(false);
  readonly recognitionPhase = signal<RecognitionPhase | 'Ricerca' | undefined>(undefined);
  readonly slowRecognition = signal(false);
  private stream?: MediaStream;
  private scanAbort?: AbortController;
  readonly count = computed(() => this.records().length);
  defaults = { condition: 'Near Mint' as Condition, finish: 'Normal' as Finish, storageLocation: '' };
  query = ''; nextPage?: string; selected?: CatalogCard;
  selectedIdentity?: IdentityCandidate; printingLanguage=''; printingSet='';
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
      this.identityCandidates.set([]);this.selectedIdentity=undefined;this.candidates.set(loadMore ? [...this.candidates(), ...result.cards] : result.cards); this.nextPage = result.nextPage;
    } catch (error) { this.message.set(this.error(error)); } finally { this.busy.set(false); }
  }
  async chooseIdentity(identity:IdentityCandidate,loadMore=false):Promise<void>{
    this.busy.set(true);this.message.set('');this.selectedIdentity=identity;
    if(!loadMore){this.printingLanguage=identity.proposedLanguage;this.printingSet='';this.candidates.set([]);this.nextPage=undefined;}
    try{const result=await this.catalog.printings(identity,{language:this.printingLanguage||undefined,setCode:this.printingSet.trim()||undefined},loadMore?this.nextPage:undefined);this.candidates.set(loadMore?[...this.candidates(),...result.cards]:result.cards);this.nextPage=result.nextPage;if(!result.cards.length)this.message.set('Nessuna stampa fisica con questi filtri.');}
    catch(error){this.message.set(this.error(error));}finally{this.busy.set(false);}
  }
  applyPrintingFilters():void{if(this.selectedIdentity)void this.chooseIdentity(this.selectedIdentity);}
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
      this.message.set(existing ? `${record.catalog.name} aggiornata.` : `${record.catalog.name} aggiunta.`); this.query = ''; this.candidates.set([]);this.identityCandidates.set([]);this.selectedIdentity=undefined; this.selected = undefined; this.editingId = undefined; this.view.set('capture');
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
    this.busy.set(true); this.slowRecognition.set(false); this.scanAbort = new AbortController();
    const slowTimer = setTimeout(() => this.slowRecognition.set(true), 15_000);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas non disponibile.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const guide = this.guideInFrame(video);
      const qualityCanvas = document.createElement('canvas'); qualityCanvas.width = 640; qualityCanvas.height = 160;
      const qualityContext = qualityCanvas.getContext('2d', { willReadFrequently: true }); if (!qualityContext) throw new Error('Canvas non disponibile.');
      qualityContext.drawImage(canvas, guide.x*canvas.width, guide.y*canvas.height, guide.width*canvas.width, guide.height*canvas.height, 0, 0, qualityCanvas.width, qualityCanvas.height);
      const quality = this.recognition.quality(qualityContext.getImageData(0, 0, qualityCanvas.width, qualityCanvas.height));
      if (!quality.acceptable && !confirm(`${quality.reasons.join('. ')}. Usare comunque?`)) return;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Acquisizione non riuscita.')), 'image/jpeg', .9));
      const result = await this.recognition.recognize(blob, guide, this.scanAbort.signal, phase => this.recognitionPhase.set(phase));
      this.recognitionPhase.set('Ricerca');
      const automatic = await this.catalog.automatic(result, this.scanAbort.signal);
      this.lastRecognition.set(result); this.recognitionFailed.set(automatic.status==='unmatched');
      this.candidates.set([]);this.identityCandidates.set(automatic.status==='ambiguous'?automatic.candidates:[]);this.query='';this.nextPage=undefined;
      if(automatic.status==='identified')await this.chooseIdentity(automatic.candidate);
      this.stopCamera(); this.view.set('search');
      if(automatic.status==='unmatched')this.message.set('Testo non riconosciuto.');
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) this.message.set(this.error(error)); }
    finally { clearTimeout(slowTimer); this.busy.set(false); this.recognitionPhase.set(undefined); this.slowRecognition.set(false); this.scanAbort = undefined; }
  }
  async cancelRecognition(): Promise<void> { this.scanAbort?.abort(); await this.recognition.destroy(); this.message.set('Riconoscimento annullato.'); }
  openManualSearch(): void { this.scanAbort?.abort(); this.query=''; this.candidates.set([]);this.identityCandidates.set([]);this.selectedIdentity=undefined; this.stopCamera(); this.view.set('search'); }
  async retryPhoto(): Promise<void> {
    this.lastRecognition.set(undefined); this.recognitionFailed.set(false); this.candidates.set([]);this.identityCandidates.set([]);this.selectedIdentity=undefined; this.query = '';
    this.view.set('capture');
    await this.startCamera();
  }
  skipCard(): void {
    this.lastRecognition.set(undefined); this.recognitionFailed.set(false); this.candidates.set([]);this.identityCandidates.set([]);this.selectedIdentity=undefined; this.query = '';
    this.view.set('capture');
  }
  stopCamera(): void { this.stream?.getTracks().forEach((track) => track.stop()); this.stream = undefined; this.cameraOpen.set(false); }
  private guideInFrame(video: HTMLVideoElement): {x:number;y:number;width:number;height:number} {
    const box=video.getBoundingClientRect(), guideBox=this.titleGuide?.nativeElement.getBoundingClientRect(), scale=Math.max(box.width/video.videoWidth,box.height/video.videoHeight);
    const renderedWidth=video.videoWidth*scale,renderedHeight=video.videoHeight*scale,offsetX=(box.width-renderedWidth)/2,offsetY=(box.height-renderedHeight)/2;
    const left=(guideBox?.left??box.left)-box.left,top=(guideBox?.top??box.top)-box.top,right=(guideBox?.right??box.right)-box.left,bottom=(guideBox?.bottom??box.bottom)-box.top;
    return{x:Math.max(0,(left-offsetX)/renderedWidth),y:Math.max(0,(top-offsetY)/renderedHeight),width:Math.min(1,(right-offsetX)/renderedWidth)-Math.max(0,(left-offsetX)/renderedWidth),height:Math.min(1,(bottom-offsetY)/renderedHeight)-Math.max(0,(top-offsetY)/renderedHeight)};
  }
  private error(error: unknown): string { return error instanceof Error ? error.message : 'Operazione non riuscita.'; }
}
