import {Component, ElementRef, EventEmitter, OnInit, Output, SecurityContext, ViewChild} from '@angular/core';
import {ExtractionService} from "../../../../../../shared/src/services/extraction/extraction.service";
import {WebsiteMetadataModel, WebsiteModel} from "../../../../../../shared/src/models/website.model";
import {MatDialogRef} from "@angular/material/dialog";
import {
  KnowledgeSourceReference,
  KnowledgeSource,
  SourceModel
} from "../../../../../../shared/src/models/knowledge.source.model";
import {UuidModel} from "../../../../../../shared/src/models/uuid.model";
import {UuidService} from "../../../../../../shared/src/services/uuid/uuid.service";
import {ProjectService} from "../../../../../../shared/src/services/projects/project.service";
import {FaviconExtractorService} from "../../../../../../shared/src/services/favicon/favicon-extractor.service";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-website-extraction-form',
  templateUrl: './website-extraction-form.component.html',
  styleUrls: ['./website-extraction-form.component.scss']
})
export class WebsiteExtractionFormComponent implements OnInit {
  @ViewChild('extractor') extractorElement: ElementRef = {} as ElementRef;
  url: string = '';
  @Output() outKS = new EventEmitter<KnowledgeSource>();
  parentId: UuidModel;
  websiteKS: KnowledgeSource | undefined = undefined;
  panelOpenState = false;
  validUrl: boolean = false;
  title: string = '';
  topics: string[] = [];
  icon: any;
  validating: boolean = false;

  constructor(private dialogRef: MatDialogRef<any>,
              private extractionService: ExtractionService,
              private uuidService: UuidService,
              private projectService: ProjectService,
              private faviconService: FaviconExtractorService,
              private sanitizer: DomSanitizer) {

    this.parentId = projectService.getCurrentProjectId();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.extractorElement.nativeElement.focus();
    }, 350);
  }

  checkUrl() {
    this.validating = true;
    let sanitizedUrl = this.sanitizer.sanitize(SecurityContext.URL, this.url);
    if (!sanitizedUrl) {
      console.error('Unable to sanitize URL. Exiting.');
      this.dialogRef.close();
      return;
    }
    this.url = sanitizedUrl;

    this.extractionService.extractWebsiteMetadata(this.url).then((metadata: WebsiteMetadataModel) => {
      this.title = metadata.title ? metadata.title : '';

      // ------------------------------------------------------------------------------------------
      // Construct WebsiteModel and KS reference
      let siteUrl = new URL(this.url);
      const site: WebsiteModel = {url: this.url, dateExtracted: Date(), metadata: metadata};
      const source = new SourceModel(undefined, undefined, site);
      const ref = new KnowledgeSourceReference('website', source, siteUrl);
      const uuid = this.uuidService.generate(1)[0];

      // ------------------------------------------------------------------------------------------
      // Create new Knowledge Source
      this.websiteKS = new KnowledgeSource(this.title, uuid, 'website', ref);
      this.websiteKS.icon = metadata.icon ? metadata.icon : this.faviconService.generic();
      this.websiteKS.iconUrl = this.faviconService.generic();

      // ------------------------------------------------------------------------------------------
      // Change dialog state
      this.validating = false;
      this.validUrl = true;
    }).catch((error) => {
      console.error('Unable to extract metadata from ', this.url);
      console.error(error);
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  extract() {
    this.emplaceIds();
    this.emplaceMetadata();
    this.emitKnowledgeSource();
  }

  emplaceIds() {
    if (this.websiteKS) {
      this.websiteKS.topics = [];
      if (this.topics.length > 0) {
        for (let i = 0; i < this.topics.length; i++) {
          this.websiteKS.topics.push(this.topics[i]);
        }
      }
    }
  }

  emplaceMetadata() {
    let url = new URL(this.url);
    if (this.websiteKS) {
      this.websiteKS.title = this.title;
      this.websiteKS.associatedProjects = [this.parentId];
      this.websiteKS.sourceRef = 'extract';
      this.websiteKS.iconUrl = url.hostname;
    }
  }

  emitKnowledgeSource() {
    console.log('Emitting KS: ', this.websiteKS);
    this.outKS.emit(this.websiteKS);
  }

  topicEvent(topics: string[]) {
    this.topics = topics;
  }
}
