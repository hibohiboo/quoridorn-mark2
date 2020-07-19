<template>
  <div class="container" ref="window-container">
    <div class="operate-box">
      <s-check
        class="view-check"
        v-model="isViewThumbnail"
        colorStyle="skyblue"
        c-icon="image"
        :c-label="$t('label.thumbnail')"
        n-icon="list2"
        :n-label="$t('label.list')"
        @hover="onHoverThumbnailView"
      />
      <input
        type="text"
        class="search-name"
        :value="searchText"
        @input="searchText = $event.target.value"
        :placeholder="$t('label.search-name-box')"
        @keydown.enter.prevent.stop
        @keyup.enter.prevent.stop
        @keydown.229.prevent.stop
        @keyup.229.prevent.stop
      />
    </div>
    <simple-tab-component
      class="tag-tab"
      :windowKey="windowKey"
      :tabList="tabList"
      v-model="currentTabInfo"
    >
      <div class="tab-container">
        <media-item-component
          v-for="media in useMediaList"
          :key="media.id"
          :media="media"
          :isViewThumbnail="isViewThumbnail"
          @preview="preview(media)"
          @chmod="chmodMedia(media)"
          @delete="deleteMedia(media)"
          @addCutIn="addCutIn(media)"
        />
      </div>
    </simple-tab-component>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { Mixins } from "vue-mixin-decorator";
import WindowVue from "../../core/window/WindowVue";
import LifeCycle from "../../core/decorator/LifeCycle";
import GameObjectManager from "@/app/basic/GameObjectManager";
import SimpleTabComponent from "@/app/core/component/SimpleTabComponent.vue";
import { TabInfo, WindowOpenInfo } from "@/@types/window";
import TaskProcessor from "@/app/core/task/TaskProcessor";
import { Task, TaskResult } from "task";
import SocketFacade, {
  permissionCheck
} from "@/app/core/api/app-server/SocketFacade";
import MediaUploadItemComponent from "@/app/basic/media/MediaUploadItemComponent.vue";
import MediaItemComponent from "@/app/basic/media/MediaItemComponent.vue";
import LanguageManager from "@/LanguageManager";
import VueEvent from "@/app/core/decorator/VueEvent";
import { StoreUseData } from "@/@types/store";
import { MediaInfo } from "@/@types/room";
import SCheck from "@/app/basic/common/components/SCheck.vue";
import TaskManager from "@/app/core/task/TaskManager";
import { DataReference } from "@/@types/data";
import { DeleteFileRequest, UploadFileRequest } from "@/@types/socket";

@Component({
  components: {
    SCheck,
    MediaItemComponent,
    MediaUploadItemComponent,
    SimpleTabComponent
  }
})
export default class MediaListWindow extends Mixins<WindowVue<void, never>>(
  WindowVue
) {
  private mediaList = GameObjectManager.instance.mediaList;
  private useMediaList: StoreUseData<MediaInfo>[] = [];
  private mediaCC = SocketFacade.instance.mediaCC();

  private tabList: TabInfo[] = [];
  private currentTabInfo: TabInfo | null = null;

  private isViewThumbnail: boolean = true;
  private searchText: string = "";

  @LifeCycle
  private async mounted() {
    await this.init();
  }

  @LifeCycle
  private created() {
    this.createTabInfoList();
  }

  @Watch("mediaList", { deep: true })
  private onChangeMediaList() {
    const beforeTab = JSON.stringify(this.currentTabInfo);
    this.createTabInfoList();
    const afterTab = JSON.stringify(this.currentTabInfo);
    if (beforeTab === afterTab) this.setUseMediaList();
  }

  @Watch("currentTabInfo")
  private onChangeCurrentTabInfo() {
    this.setUseMediaList();
  }

  @Watch("searchText")
  private onChangeSearchText() {
    this.setUseMediaList();
  }

  private setUseMediaList() {
    const regExp = this.searchText ? new RegExp(this.searchText) : null;
    this.useMediaList = this.currentTabInfo
      ? this.mediaList.filter(m => {
          if (this.currentTabInfo!.target !== m.data!.tag) return false;
          if (regExp) {
            const name = m.data!.name;
            if (!name.match(regExp)) return false;
          }
          return permissionCheck(m, "view");
        })
      : [];
  }

  @TaskProcessor("language-change-finished")
  private async languageChangeFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    this.createTabInfoList();
    task.resolve();
  }

  private createTabInfoList() {
    this.tabList = this.mediaList
      .filter(m => permissionCheck(m, "view"))
      .map(m => m.data!.tag)
      .filter((tag, idx, list) => list.indexOf(tag) === idx)
      .map(tag => ({
        target: tag,
        text: tag || LanguageManager.instance.getText("label.non-tag")
      }));
    if (!this.currentTabInfo) {
      this.currentTabInfo = this.tabList[0];
      return;
    }

    const idx = this.tabList.findIndex(
      t => JSON.stringify(t) === JSON.stringify(this.currentTabInfo)
    );
    if (idx === -1) this.currentTabInfo = this.tabList[0];
  }

  private static getDialogMessage(target: string) {
    const msgTarget = "media-list-window.dialog." + target;
    return LanguageManager.instance.getText(msgTarget);
  }

  @VueEvent
  private async chmodMedia(media: StoreUseData<MediaInfo>) {
    await TaskManager.instance.ignition<WindowOpenInfo<DataReference>, never>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "chmod-window",
        args: {
          type: "media",
          docId: media.id!
        }
      }
    });
  }

  @VueEvent
  private async deleteMedia(media: StoreUseData<MediaInfo>) {
    const msg = MediaListWindow.getDialogMessage("delete-media").replace(
      "$1",
      media.data!.name
    );
    const result = window.confirm(msg);
    if (!result) return;

    try {
      await this.mediaCC.touchModify([media.id!]);
    } catch (err) {
      // TODO error message.
      return;
    }
    await this.mediaCC.delete([media.id!]);

    await SocketFacade.instance.socketCommunication<DeleteFileRequest, void>(
      "delete-file",
      { urlList: [media.data!.url] }
    );
  }

  private setHoverWindowMessage(isHover: boolean, messageType: string) {
    this.windowInfo.message = isHover
      ? LanguageManager.instance.getText(
          `${this.windowInfo.type}.message-list.${messageType}`
        )
      : "";
  }

  @VueEvent
  private async addCutIn(media: StoreUseData<MediaInfo>) {
    await TaskManager.instance.ignition<WindowOpenInfo<MediaInfo>, never>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "bgm-add-window",
        args: media.data!
      }
    });
  }

  @VueEvent
  private onHoverThumbnailView(isHover: boolean) {
    this.setHoverWindowMessage(isHover, "choose-view-mode");
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";

.container {
  @include flex-box(column, stretch, center);
  width: 100%;
  height: 100%;
}

.operate-box {
  @include inline-flex-box(row, flex-end, center);
  height: 2em;
  margin-bottom: 0.5rem;
}

.search-name {
  @include inline-flex-box(row, flex-start, center);
  font-size: inherit;
  height: 2em;
  min-height: 2em;
}

.tag-tab {
  @include flex-box(column, stretch, flex-start);
  height: calc(100% - 2em - 0.5rem);
}

.tab-container {
  @include inline-flex-box(column, stretch, flex-start);
  flex: 1;
  border: 1px solid gray;
  overflow-y: scroll;
  margin-top: -1px;
  padding: 0.5rem;
}
</style>