import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SecurityContext, SimpleChanges} from '@angular/core';
import {ElectronIpcService} from "../../../services/electron-ipc/electron-ipc.service";
import {IpcResponse, KsBrowserViewRequest} from "kc_electron/src/app/models/electron.ipc.model";
import {DomSanitizer} from "@angular/platform-browser";
import {KcViewportHeaderConfig, KcViewportHeaderEvent} from "../shared/viewport-header/viewport-header.component";
import {Subscription} from "rxjs";

export interface KcBrowserViewConfig {
  url: URL,
  isDialog?: true,
  canSave?: true
}

export interface KcBrowserViewNavEvent {
  urlChanged?: true,
  url?: URL
}

export interface KcBrowserViewClickEvent extends KcViewportHeaderEvent {
}


@Component({
  selector: 'ks-lib-browser-view',
  templateUrl: './browser-view.component.html',
  styleUrls: ['./browser-view.component.css']
})
export class BrowserViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() kcBrowserViewConfig!: KcBrowserViewConfig;
  @Output() viewReady = new EventEmitter<boolean>();
  @Output() onIpcResponse = new EventEmitter<IpcResponse>();
  @Output() navEvent = new EventEmitter<KcBrowserViewNavEvent>();
  @Output() clickEvent = new EventEmitter<KcBrowserViewClickEvent>();
  @Output() selectEvent = new EventEmitter();
  headerConfig: KcViewportHeaderConfig | undefined;
  private stateCheckInterval: any;
  private navEventSubscription: Subscription = new Subscription();
  private goBackSubscription: Subscription = new Subscription();
  private goForwardSubscription: Subscription = new Subscription();
  private urlSubscription: Subscription = new Subscription();

  constructor(private ipcService: ElectronIpcService, private sanitizer: DomSanitizer) {
    this.headerConfig = {
      canClose: true,
      canCopy: true,
      canGoBack: false,
      canGoForward: false,
      canRefresh: true,
      canSave: false,
      displayTextReadOnly: true,
      showSaveButton: true,
      showNavButtons: true,
      showActionButtons: true,
      showDisplayText: true
    }
  }

  ngOnInit(): void {
    this.goBackSubscription = this.ipcService.browserViewCanGoBackResult.subscribe((canGoBack) => {
      if (this.headerConfig)
        this.headerConfig.canGoBack = canGoBack;
    });

    this.goForwardSubscription = this.ipcService.browserViewCanGoForwardResult.subscribe((canGoForward) => {
      if (this.headerConfig)
        this.headerConfig.canGoForward = canGoForward;
    });

    this.urlSubscription = this.ipcService.browserViewCurrentUrlResult.subscribe((url) => {
      if (this.headerConfig)
        this.headerConfig.displayText = url;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    let kcBrowserViewConfig: KcBrowserViewConfig = changes.kcBrowserViewConfig.currentValue;

    // Only load browser view once (on first change, i.e. when the input first arrives)
    if (changes.kcBrowserViewConfig.isFirstChange()) {
      if (!this.headerConfig) {
        console.warn('Could not load browser view: header config undefined...');
        return;
      }

      this.loadBrowserView();
    }

    if (kcBrowserViewConfig && this.headerConfig) {
      this.headerConfig.displayText = kcBrowserViewConfig.url.href;
      this.headerConfig.canClose = kcBrowserViewConfig.isDialog;
      this.headerConfig.canSave = kcBrowserViewConfig.canSave;
    }

  }

  ngOnDestroy() {
    if (this.stateCheckInterval)
      clearInterval(this.stateCheckInterval);
    this.navEventSubscription.unsubscribe();
    this.goBackSubscription.unsubscribe();
    this.goForwardSubscription.unsubscribe();
    this.urlSubscription.unsubscribe();
  }

  loadBrowserView() {
    let sanitizedUrl = this.sanitizer.sanitize(SecurityContext.URL, this.kcBrowserViewConfig.url.href);
    if (!sanitizedUrl) {
      console.error('Unable to load resource with invalid URL...');
      return;
    }

    let position = this.getBrowserViewDimensions('browser-view');
    let request: KsBrowserViewRequest = {
      url: sanitizedUrl,
      x: Math.floor(position.x),
      y: Math.floor(position.y + 32),
      width: Math.ceil(position.width),
      height: Math.ceil(position.height)
    }

    this.ipcService.openBrowserView(request).then((response: IpcResponse) => {
      if (response.success) {
        this.viewReady.emit(true);
      }
      this.onIpcResponse.emit(response);
    });

    this.navEventSubscription = this.ipcService.navEvent.subscribe((url) => {
      if (!url || url.trim() === '') {
        return;
      }

      let navEvent: KcBrowserViewNavEvent = {
        urlChanged: true,
        url: new URL(url)
      }
      this.navEvent.emit(navEvent);
    });
  }


  getBrowserViewDimensions(elementName: string): any {
    let element = document.getElementById(elementName);
    if (element) {
      return element.getBoundingClientRect();
    }
  }

  getBrowserViewState() {
    if (!this.ipcService) {
      console.warn('Unable to get browser view state because IPC service does not exist...');
      return;
    }
    this.ipcService.triggerBrowserViewStateUpdate();
  }

  headerEvents(headerEvent: KcViewportHeaderEvent) {
    if (headerEvent.refreshClicked) {
      this.ipcService.browserViewRefresh();
    }

    if (headerEvent.backClicked) {
      this.ipcService.browserViewGoBack();
    }

    if (headerEvent.forwardClicked) {
      this.ipcService.browserViewGoForward();
    }

    this.getBrowserViewState();

    this.clickEvent.emit(headerEvent);
  }
}
