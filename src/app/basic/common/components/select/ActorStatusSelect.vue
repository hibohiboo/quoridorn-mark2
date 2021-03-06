<template>
  <ctrl-select
    :elmId="elmId"
    v-model="localValue"
    :optionInfoList="optionInfoList"
    :readonly="readonly"
    ref="component"
  />
</template>

<script lang="ts">
import SelectMixin from "./base/SelectMixin";
import { Component, Mixins } from "vue-mixin-decorator";
import { Task, TaskResult } from "task";
import { Prop, Watch } from "vue-property-decorator";
import ComponentVue from "../../../../core/window/ComponentVue";
import LifeCycle from "../../../../core/decorator/LifeCycle";
import TaskProcessor from "../../../../core/task/TaskProcessor";
import CtrlSelect from "../../../../core/component/CtrlSelect.vue";
import { HtmlOptionInfo } from "@/@types/window";
import GameObjectManager from "../../../GameObjectManager";

interface MultiMixin extends SelectMixin, ComponentVue {}

@Component({
  components: { CtrlSelect }
})
export default class ActorStatusSelect extends Mixins<MultiMixin>(
  SelectMixin,
  ComponentVue
) {
  @Prop({ type: String, default: null })
  private actorKey!: string | null;

  @Prop({ type: Boolean, default: false })
  private nullable!: boolean;

  private optionInfoList: HtmlOptionInfo[] = [];

  private statusList = GameObjectManager.instance.actorStatusList;

  @LifeCycle
  private created() {
    this.createOptionInfoList();
  }

  @Watch("actorKey")
  private onChangeActorKey() {
    this.createOptionInfoList();
  }

  @Watch("statusList", { deep: true })
  private onChangeStatusList() {
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
    this.optionInfoList = this.statusList
      .filter(s => s.owner === this.actorKey)
      .map(s => {
        return {
          key: s.key,
          value: s.key,
          text: s.data!.name,
          disabled: false
        };
      });
    if (this.nullable) {
      this.optionInfoList.unshift({
        key: null,
        value: null,
        text: this.$t("label.non-select")!.toString(),
        disabled: false
      });
    }
    this.optionInfoList.unshift({
      key: "",
      value: "",
      text: this.$t("label.status")!.toString(),
      disabled: true
    });
  }
}
</script>
