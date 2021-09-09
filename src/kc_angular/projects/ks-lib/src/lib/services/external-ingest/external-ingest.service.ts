import {Injectable, SecurityContext} from '@angular/core';
import {BehaviorSubject} from "rxjs";
import {KnowledgeSource, KnowledgeSourceReference, SourceModel} from "projects/ks-lib/src/lib/models/knowledge.source.model";
import {ExtractionService} from "../extraction/extraction.service";
import {UuidService} from "../uuid/uuid.service";
import {FaviconExtractorService} from "../favicon/favicon-extractor.service";
import {ElectronIpcService} from "../electron-ipc/electron-ipc.service";
import {DomSanitizer} from "@angular/platform-browser";
import {KsFactoryService} from "../ks-factory/ks-factory.service";

@Injectable({
  providedIn: 'root'
})
export class ExternalIngestService {
  private externalKS = new BehaviorSubject<KnowledgeSource[]>([]);
  ks = this.externalKS.asObservable();
  private receive = window.api.receive;
  private send = window.api.send;

  constructor(private faviconService: FaviconExtractorService,
              private extractionService: ExtractionService,
              private ipcService: ElectronIpcService,
              private ksFactory: KsFactoryService,
              private uuidService: UuidService,
              private sanitizer: DomSanitizer) {

    /**
     * Subscribe to browser watcher, which communicates with Electron IPC, which in turn listens to browser extensions
     * Once an extension event occurs, create a new Knowledge Source and notify listeners that a new KS is available
     */
    this.ipcService.browserWatcher().subscribe((link) => {
      let sanitized = this.sanitizer.sanitize(SecurityContext.URL, link);
      if (!sanitized) {
        console.warn('Unable to sanitize URL received from browser... rejecting!');
        return;
      }

      this.ksFactory.make('website', sanitized).then((ks) => {
        if (!ks)
          return;
        console.log('Got KS from factory: ', ks);
        this.externalKS.next([ks]);
      }).catch((reason) => {
        console.warn('Unable to create Knowledge Source from extension because: ', reason);
      });
    });

    /**
     * Subscribe to file watcher, which communicates with Electron IPC, which in turn watches a local directory for files
     * Once an extension event occurs, create a new Knowledge Source and notify listeners that a new KS is available
     */
    this.ipcService.fileWatcher().subscribe((fileModels) => {
      let iconRequests = [];
      let ksList: KnowledgeSource[] = [];
      for (let fileModel of fileModels) {
        iconRequests.push(fileModel.path);
      }
      this.ipcService.getFileIcon(iconRequests).then((icons) => {
        for (let i = 0; i < fileModels.length; i++) {
          let fileModel = fileModels[i];
          let sourceLink = fileModel.path;
          let source = new SourceModel(fileModel, undefined, undefined);
          let ref = new KnowledgeSourceReference('file', source, sourceLink);
          let ks = new KnowledgeSource(fileModel.filename, fileModel.id, 'file', ref);
          ks.dateAccessed = new Date(fileModel.accessTime);
          ks.dateModified = new Date(fileModel.modificationTime);
          ks.dateCreated = new Date(fileModel.creationTime);
          ks.iconUrl = this.faviconService.file();
          ks.icon = icons[i];
          ksList.push(ks);
        }
        this.externalKS.next(ksList);
      });
    });
  }
}
