<template>
  <div class="chat-palette-info-form">
    <table>
      <tr>
        <tr-string-input-component
          labelName="label.name"
          width="100%"
          v-model="nameVolatile"
        />
      </tr>
      <tr>
        <tr-chat-color-input-component
          labelName="label.chat-font-color"
          :type.sync="chatFontColorTypeVolatile"
          :color.sync="chatFontColorVolatile"
        />
      </tr>
      <!-- アクターID -->
      <tr>
        <tr-actor-select-component
          labelName="label.actor"
          v-model="actorKeyVolatile"
          :nullable="true"
        />
      </tr>
      <!-- コマID -->
      <tr>
        <tr-scene-object-select-component
          labelName="label.scene-object"
          :actorKey="actorKey"
          v-model="sceneObjectKeyVolatile"
          :nullable="true"
        />
      </tr>
      <!-- targetKey -->
      <!-- outputTabKey -->
      <!-- ステータス -->
      <tr>
        <tr-actor-status-select-component
          labelName="label.status"
          :actorKey="actorKey"
          v-model="statusKeyVolatile"
          :nullable="true"
        />
      </tr>
      <!-- 秘匿フラグ -->
      <tr>
        <tr-checkbox-component
          labelName="label.secret"
          :cLabel="$t('label.secret')"
          :nLabel="$t('label.non-secret')"
          v-model="isSecretVolatile"
        />
      </tr>
    </table>

    <!-- テキストタブ -->
    <label>
      <textarea class="input" v-model="paletteTextVolatile"></textarea>
    </label>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { Mixins } from "vue-mixin-decorator";
import TrActorSelectComponent from "../common/components/TrActorSelectComponent.vue";
import TrGeneralTypeSelectComponent from "../common/components/TrGeneralTypeSelectComponent.vue";
import LifeCycle from "../../core/decorator/LifeCycle";
import TrActorStatusSelectComponent from "../common/components/TrActorStatusSelectComponent.vue";
import ComponentVue from "../../core/window/ComponentVue";
import TrCheckboxComponent from "../common/components/TrCheckboxComponent.vue";
import TrStringInputComponent from "../common/components/TrStringInputComponent.vue";
import TrChatColorInputComponent from "../common/components/TrChatColorInputComponent.vue";
import TrSceneObjectSelectComponent from "../common/components/TrSceneObjectSelectComponent.vue";
import TrNumberInputComponent from "../common/components/TrNumberInputComponent.vue";

@Component({
  components: {
    TrCheckboxComponent,
    TrSceneObjectSelectComponent,
    TrActorSelectComponent,
    TrActorStatusSelectComponent,
    TrGeneralTypeSelectComponent,
    TrChatColorInputComponent,
    TrNumberInputComponent,
    TrStringInputComponent
  }
})
export default class ChatPaletteInfoForm extends Mixins<ComponentVue>(
  ComponentVue
) {
  @Prop({ type: String, required: true })
  private windowKey!: string;

  @Prop({ type: Boolean, required: true })
  private isAdd!: boolean;

  private isMounted: boolean = false;

  @LifeCycle
  public async mounted() {
    this.isMounted = true;
  }

  // name
  @Prop({ type: String, required: true })
  private name!: string;
  private nameVolatile: string = "";
  @Watch("name", { immediate: true })
  private onChangeName(value: string) {
    this.nameVolatile = value;
  }
  @Watch("nameVolatile")
  private onChangeNameVolatile(value: string) {
    this.$emit("update:name", value);
  }

  // paletteText
  @Prop({ type: String, required: true })
  private paletteText!: string;
  private paletteTextVolatile: string = "";
  @Watch("paletteText", { immediate: true })
  private onChangePaletteText(value: string) {
    this.paletteTextVolatile = value;
  }
  @Watch("paletteTextVolatile")
  private onChangePaletteTextVolatile(value: string) {
    this.$emit("update:paletteText", value);
  }

  // chatFontColorType
  @Prop({ type: String, required: true })
  private chatFontColorType!: "owner" | "original";
  private chatFontColorTypeVolatile: "owner" | "original" = "owner";
  @Watch("chatFontColorType", { immediate: true })
  private onChangeChatFontColorType(value: "owner" | "original") {
    this.chatFontColorTypeVolatile = value;
  }
  @Watch("chatFontColorTypeVolatile")
  private onChangeChatFontColorTypeVolatile(value: "owner" | "original") {
    this.$emit("update:chatFontColorType", value);
  }

  // chatFontColor
  @Prop({ type: String, required: true })
  private chatFontColor!: string;
  private chatFontColorVolatile: string = "#000000";
  @Watch("chatFontColor", { immediate: true })
  private onChangeChatFontColor(value: string) {
    this.chatFontColorVolatile = value;
  }
  @Watch("chatFontColorVolatile")
  private onChangeChatFontColorVolatile(value: string) {
    this.$emit("update:chatFontColor", value);
  }

  // actorKey
  @Prop({ type: String, default: null })
  private actorKey!: string | null;
  private actorKeyVolatile: string | null = null;
  @Watch("actorKey", { immediate: true })
  private onChangeActorKey(value: string | null) {
    this.actorKeyVolatile = value;
  }
  @Watch("actorKeyVolatile")
  private onChangeActorKeyVolatile(value: string | null) {
    this.$emit("update:actorKey", value);
  }

  // sceneObjectKey
  @Prop({ type: String, default: null })
  private sceneObjectKey!: string | null;
  private sceneObjectKeyVolatile: string | null = null;
  @Watch("sceneObjectKey", { immediate: true })
  private onChangeSceneObjectKey(value: string | null) {
    this.sceneObjectKeyVolatile = value;
  }
  @Watch("sceneObjectKeyVolatile")
  private onChangeSceneObjectKeyVolatile(value: string | null) {
    this.$emit("update:sceneObjectKey", value);
  }

  // targetKey
  @Prop({ type: String, default: null })
  private targetKey!: string | null;
  private targetKeyVolatile: string | null = null;
  @Watch("targetKey", { immediate: true })
  private onChangeTargetKey(value: string | null) {
    this.targetKeyVolatile = value;
  }
  @Watch("targetKeyVolatile")
  private onChangeTargetKeyVolatile(value: string | null) {
    this.$emit("update:targetKey", value);
  }

  // outputTabKey
  @Prop({ type: String, default: null })
  private outputTabKey!: string | null;
  private outputTabKeyVolatile: string | null = null;
  @Watch("outputTabKey", { immediate: true })
  private onChangeOutputTabKey(value: string | null) {
    this.outputTabKeyVolatile = value;
  }
  @Watch("outputTabKeyVolatile")
  private onChangeOutputTabKeyVolatile(value: string | null) {
    this.$emit("update:outputTabKey", value);
  }

  // statusKey
  @Prop({ type: String, default: null })
  private statusKey!: string | null;
  private statusKeyVolatile: string | null = null;
  @Watch("statusKey", { immediate: true })
  private onChangeStatusKey(value: string | null) {
    this.statusKeyVolatile = value;
  }
  @Watch("statusKeyVolatile")
  private onChangeStatusKeyVolatile(value: string | null) {
    this.$emit("update:statusKey", value);
  }

  // system
  @Prop({ type: String, default: null })
  private system!: string | null;
  private systemVolatile: string | null = null;
  @Watch("system", { immediate: true })
  private onChangeSystem(value: string | null) {
    this.systemVolatile = value;
  }
  @Watch("systemVolatile")
  private onChangeSystemVolatile(value: string | null) {
    this.$emit("update:system", value);
  }

  // isSecret
  @Prop({ type: Boolean, required: true })
  private isSecret!: boolean;
  private isSecretVolatile: boolean = false;
  @Watch("isSecret", { immediate: true })
  private onChangeIsSecret(value: boolean) {
    this.isSecretVolatile = value;
  }
  @Watch("isSecretVolatile")
  private onChangeIsSecretVolatile(value: boolean) {
    this.$emit("update:isSecret", value);
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";

.chat-palette-info-form {
  display: contents;
}

> table {
  table-layout: fixed;

  th,
  td {
    label {
      @include inline-flex-box(row, flex-start, center);
    }
  }

  th {
    text-align: right;
    padding: 0;
    white-space: nowrap;
    width: 1px;
  }

  td {
    text-align: left;
    padding: 0;

    input {
      margin: 0;
    }
  }
}

label {
  flex: 1;
}

textarea {
  resize: none;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>
