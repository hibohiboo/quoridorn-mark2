<template>
  <ctrl-select
    :elmId="elmId"
    v-model="localValue"
    :optionInfoList="optionInfoList"
    ref="component"
  />
</template>

<script lang="ts">
import SelectMixin from "./base/SelectMixin";

import { Component, Mixins } from "vue-mixin-decorator";
import { Prop, Watch } from "vue-property-decorator";
import TaskProcessor from "../../../../core/task/TaskProcessor";
import CtrlSelect from "../../../../core/component/CtrlSelect.vue";
import ComponentVue from "../../../../core/window/ComponentVue";
import { HtmlOptionInfo } from "@/@types/window";
import { Task, TaskResult } from "task";

interface MultiMixin extends SelectMixin, ComponentVue {}

@Component({ components: { CtrlSelect } })
export default class SelectionValueSelect extends Mixins<MultiMixin>(
  SelectMixin,
  ComponentVue
) {
  @Prop({ type: String, required: true })
  private selection!: string;

  private optionInfoList: HtmlOptionInfo[] = [];

  @Watch("selection", { immediate: true })
  private onChangeSelection() {
    this.createOptionInfoList();
  }

  @TaskProcessor("language-change-finished")
  private async languageChangeFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    this.createOptionInfoList();
    task.resolve();
  }

  private createOptionInfoList() {
    this.optionInfoList = this.selection
      .split(",")
      .map(s => s.trim())
      .map(s => ({ value: s, key: s, text: s, disabled: false }));
    const getDisabledValue = (v: string): string => {
      const disabledOption = this.optionInfoList.find(o => o.value === v);
      return disabledOption ? getDisabledValue("#" + v) : v;
    };
    const disabledValue = getDisabledValue("");
    this.optionInfoList.unshift({
      value: disabledValue,
      key: disabledValue,
      text: this.$t("selection.selection-value.label")!.toString(),
      disabled: true
    });
    // setTimeout(() => {
    //   if (this.optionInfoList.length > 1) {
    //     this.localValue = this.optionInfoList[1].value;
    //   }
    // });
  }
}
</script>
