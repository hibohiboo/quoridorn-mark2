<template>
  <div id="context" v-if="type" @mouseleave.prevent="hide" @contextmenu.prevent>
    <div
      v-for="level in getLevelList()"
      :key="level"
      :style="getLevelStyle(level)"
      class="level-box"
      :class="`level-${level}`"
    >
      <div class="title" v-if="level === 0">{{ title }}</div>
      <template v-for="(item, index) in getLevelItemList(level)">
        <hr
          :key="`${level}-${index}`"
          :style="getItemStyle(item)"
          v-if="item.type === 'hr'"
          @mouseenter="onHoverItem(level, index)"
        />
        <div
          :key="`${level}-${index}`"
          :style="getItemStyle(item)"
          v-if="item.type !== 'hr'"
          class="item"
          :class="[
            item.disabled ? 'disabled' : undefined,
            `level-${item.level}`,
            item.hasChild ? 'has-child' : undefined
          ]"
          @click.left.stop="emitEvent(item)"
          @mouseenter="onHoverItem(level, index)"
        >
          {{ item.isRawText ? item.text : $t(item.text) }}
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component } from "vue-mixin-decorator";
import { Vue } from "vue-property-decorator";
import {
  ContextDeclare,
  ContextDeclareInfo,
  ContextItemDeclare,
  ContextItemDeclareBlock,
  ContextItemDeclareInfo,
  ContextTaskInfo
} from "context";
import { Task, TaskResult } from "task";
import { judgeCompare } from "../utility/CompareUtility";
import TaskProcessor from "../task/TaskProcessor";
import TaskManager from "../task/TaskManager";
import VueEvent from "../decorator/VueEvent";
import { createPoint } from "../utility/CoordinateUtility";
import GameObjectManager from "../../basic/GameObjectManager";
import { clone } from "../utility/PrimaryDataUtility";
import LifeCycle from "../decorator/LifeCycle";
import { findByKey } from "../utility/Utility";
import { SceneObjectStore } from "@/@types/store-data";

const contextInfo: ContextDeclare = require("../context.yaml");
const contextItemInfo: ContextItemDeclareBlock = require("../context-item.yaml");

type Item = {
  type: string;
  index: number;
  text?: string;
  isRawText?: boolean;
  taskName?: string;
  arg?: any;
  disabled?: boolean;
  level: number; // 階層
  parentIndex: number; // 親が上から何番目だったか
  hasChild: boolean; // 子要素があるか
};

@Component
export default class Context extends Vue {
  private type: string | null = null;
  private target: string | null = null;
  private pieceKey: string | undefined = undefined;
  private x: number | null = null;
  private y: number | null = null;
  private title: string = "";

  private itemList: Item[] = [];
  private hoverIndexList: number[] = [0];

  @VueEvent
  private getElm(): HTMLElement {
    return document.getElementById("context") as HTMLElement;
  }

  @VueEvent
  private onHoverItem(level: number, index: number) {
    if (this.hoverIndexList.length - 1 > level) {
      this.hoverIndexList.splice(this.hoverIndexList.length - 1, 1);
      return;
    }
    if (this.hoverIndexList.length - 1 === level) {
      this.hoverIndexList.splice(this.hoverIndexList.length - 1, 1, index);
      return;
    }
    this.hoverIndexList.push(index);
  }

  @VueEvent
  private getLevelList(): number[] {
    const levelList = this.hoverIndexList.map((_index, index) => index);
    const lastLevel = this.hoverIndexList.length - 1;
    const lastLevelIndex = this.hoverIndexList[this.hoverIndexList.length - 1];
    const hoverItem = this.itemList.find(
      item => item.level === lastLevel && item.index === lastLevelIndex
    );
    if (hoverItem && hoverItem.hasChild)
      levelList.push(this.hoverIndexList.length);
    return levelList;
  }

  @VueEvent
  private getLevelStyle(level: number) {
    const elm = this.getElm();
    if (!elm) return {};
    const cRect: any = elm.getBoundingClientRect();
    const point = createPoint(0, 28);
    if (level > 0) {
      const hoverIndex = this.hoverIndexList[level - 1] + (level === 1 ? 1 : 0);
      const levelElm = elm.getElementsByClassName(`level-${level - 1}`)[0];
      const hoverItemElm = levelElm.children[hoverIndex];
      const elmRect: any = hoverItemElm.getBoundingClientRect();
      point.x = elmRect.x + elmRect.width - 7 - cRect.x;
      point.y = elmRect.y - cRect.y;
    }
    return { left: `${point.x}px`, top: `${point.y}px` };
  }

  @VueEvent
  private getLevelItemList(level: number): Item[] {
    return this.itemList.filter(item => item.level === level);
  }

  /**
   * 表示イベント
   * @param task
   */
  @TaskProcessor("context-open-finished")
  private async openContextFinished(
    task: Task<ContextTaskInfo, never>
  ): Promise<TaskResult<never> | void> {
    this.type = task.value!.type;
    this.target = task.value!.target;
    this.pieceKey = task.value!.pieceKey;
    this.x = task.value!.x - 10;
    this.y = task.value!.y - 10;

    this.hoverIndexList = [0];

    const list = GameObjectManager.instance.getList(this.type)!;
    const obj: any = list ? findByKey(list, this.target) : null;
    const name =
      obj && obj.data && "name" in obj.data
        ? " " + obj.data.name.toString()
        : "";

    this.title = `(${this.$t(`type.${this.type}`)!.toString()})${name}`;

    console.log(`【CONTEXT OPEN】 type: ${this.type} target: ${this.target}`);

    // 表示項目をリセット
    this.itemList.splice(0, this.itemList.length);

    // 定義を元に要素を構築していく
    let itemInfo: ContextDeclareInfo = contextInfo[this.type!];
    if (!itemInfo) return;

    const getRef = (itemInfo: ContextDeclareInfo): ContextItemDeclare[] => {
      if ("ref" in itemInfo) return getRef(contextInfo[itemInfo.ref]);
      return itemInfo;
    };
    itemInfo = getRef(itemInfo);

    // 直列の非同期で全部実行する
    const indexArg = [[-1, -1]];
    await itemInfo
      .map((item: ContextItemDeclare | null) => () =>
        this.addItem(item, 0, indexArg)
      )
      .reduce((prev, curr) => prev.then(curr), Promise.resolve());

    task.resolve();
  }

  /**
   * 項目追加
   * @param item
   * @param level
   * @param indexArg
   */
  private async addItem(
    item: ContextItemDeclare | null,
    level: number,
    indexArg: number[][]
  ) {
    const contextItem: ContextItemDeclareInfo = clone<ContextItemDeclareInfo>(
      item && "ref" in item ? contextItemInfo![item!.ref] : item
    );

    const levelIndexList = indexArg[level];

    // 要素がnullだったら区切り線
    if (!contextItem) {
      this.itemList.push({
        type: "hr",
        level,
        parentIndex: levelIndexList[0],
        index: ++levelIndexList[1],
        hasChild: false
      });
      return;
    }

    const type = this.type!;
    const target = this.target!;
    const pieceKey = this.pieceKey;
    const isViewCompare = contextItem.isViewCompare;

    // 項目を表示するかどうかの判定
    if (!(await judgeCompare(isViewCompare, type, target))) return;

    // テキスト項目の追加
    if ("text" in contextItem) {
      const isDisabledCompare = contextItem.isDisabledCompare;

      // 非活性の判定
      const disabled = !(await judgeCompare(isDisabledCompare, type, target));

      const argObj: DataReference & { pieceKey?: string } = {
        type,
        key: target,
        pieceKey
      };
      if (!contextItem.taskArg) {
        contextItem.taskArg = {
          args: argObj
        };
      }
      if (!contextItem.taskArg.arg) {
        contextItem.taskArg.args = argObj;
      }

      if (contextItem.argRef === "dice-pips-select") {
        const list = GameObjectManager.instance.getList(this.type!)!;
        const obj: StoreData<SceneObjectStore> | null = findByKey(list, target);
        const diceTypeKey = obj!.data!.subTypeKey;
        const diceAndPipsList = GameObjectManager.instance.diceAndPipsList;
        const pipsList = diceAndPipsList
          .filter(dap => dap.data!.diceTypeKey === diceTypeKey)
          .map(dap => dap.data!.pips);
        contextItem.children = pipsList.map(pips => ({
          text: pips,
          isRawText: true,
          taskName: "dice-pips-change",
          taskArg: { value: pips }
        }));
      }

      this.itemList.push({
        type: "item",
        level,
        parentIndex: levelIndexList[0],
        index: ++levelIndexList[1],
        taskName: contextItem.taskName || "default",
        text: contextItem.text || "default",
        isRawText: contextItem.isRawText,
        arg: contextItem.taskArg,
        disabled,
        hasChild: !!contextItem.children
      });

      if (contextItem.children) {
        indexArg.push([levelIndexList[1], -1]);

        const getRef = (itemInfo: ContextDeclareInfo): ContextItemDeclare[] => {
          if ("ref" in itemInfo) return getRef(contextInfo[itemInfo.ref]);
          return itemInfo;
        };
        contextItem.children = getRef(contextItem.children);

        await contextItem.children
          .map((item: ContextItemDeclare | null) => () =>
            this.addItem(item, level + 1, indexArg)
          )
          .reduce((prev, curr) => prev.then(curr), Promise.resolve());
      }
      return;
    }

    // 区切り線を追加
    this.itemList.push({
      type: "hr",
      level,
      parentIndex: levelIndexList[0],
      index: ++levelIndexList[1],
      hasChild: false
    });
  }

  /**
   * 項目選択
   * @param item
   */
  @VueEvent
  private async emitEvent(item: Item) {
    if (item.disabled || item.hasChild) return;
    this.hide();
    await TaskManager.instance.ignition<any, never>({
      type: item.taskName!,
      owner: "Quoridorn",
      value: item.arg
    });
  }

  /**
   * 非表示処理
   */
  private hide() {
    this.type = null;
  }

  /**
   * 表示座標制御
   */
  @LifeCycle
  private updated() {
    const elm = this.getElm();
    if (!elm) return;
    elm.style.setProperty("--x", `${this.x}px`);
    elm.style.setProperty("--y", `${this.y}px`);
  }

  @VueEvent
  private getItemStyle(item: Item) {
    const elm = this.getElm();
    if (!elm) return {};
    const level = item.level;
    const point = createPoint(0, 0);
    // const fontSize = getCssPxNum("font-size", this.elm);
    const fontSize = 14;
    if (level > 1) {
      const parentElmList = elm.getElementsByClassName(`level-${level - 1}`);
      const parentElm = parentElmList[item.parentIndex];
      const parentRect: any = parentElm.getBoundingClientRect();
      point.x = parentRect.x + parentRect.width - fontSize;
      point.y = parentRect.y;
    }
    point.y += item.index * fontSize * 2;
    return {
      left: point.x + "px",
      top: point.y + "px"
    };
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";

#context {
  position: fixed;
  left: 0;
  top: 0;
  transform: translate(var(--x), calc(var(--y) - 4em));
  font-size: 14px;
}

.level-box {
  @include inline-flex-box(column, stretch, flex-start);
  position: absolute;
  background-color: white;
  border: solid gray 1px;
  box-sizing: content-box;
}

.title {
  background-color: var(--uni-color-blue);
  color: var(--uni-color-white);
  font-weight: bold;
  display: block;
  min-width: 50px;
  padding: 0 5px;
  line-height: 1.8em;
  height: 2em;
  cursor: default;
}

hr {
  cursor: default;
}

.item {
  @include inline-flex-box(row, space-between, center);
  min-width: 5em;
  padding: 0 5px;
  height: 2em;
  cursor: pointer;

  &.has-child {
    cursor: default;

    &:after {
      content: ">";
      font-weight: bold;
    }
  }

  &:not(.title):not(.disabled):hover {
    background-color: lightblue;
  }

  &.disabled {
    background-color: lightgrey;
    cursor: default;
  }
}
</style>
