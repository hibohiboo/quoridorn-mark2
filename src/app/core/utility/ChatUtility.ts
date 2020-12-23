import { all, create } from "mathjs";
import { CustomDiceBotInfo } from "@/@types/room";
import { ChatStore } from "@/@types/store-data";
import GameObjectManager from "../../basic/GameObjectManager";
import BcdiceManager from "../api/bcdice/BcdiceManager";
import { sum } from "./PrimaryDataUtility";
import SocketFacade from "../api/app-server/SocketFacade";
import { findByKey, findRequireByKey, someByStr } from "./Utility";
import LanguageManager from "@/LanguageManager";
import App from "@/views/App.vue";
import WindowManager from "@/app/core/window/WindowManager";
import { BcdiceDiceRollResult, DiceResult } from "@/@types/store-data-optional";

const config = {};
const math = create(all, config);

// 名前空間を汚さないように3つの正規表現オブジェクトを初期化
const { borderStyleRegExp, styleRegExp, lineRegExp } = (() => {
  const colorFormat = "#[0-9a-f]+|rgba? *\\([0-9., ]+\\)|[a-z]+";
  const lineStyleFormat = "solid|double|dotted|dashed|wavy";
  const colorAndLineFormat = `(${lineStyleFormat}|${colorFormat})`;
  const styleRegExpList = [
    `(b?c)(?: *{ *)(${colorFormat})(?: *})`,
    `([uo])(?: *{ *)${colorAndLineFormat}(?: *\\| *${colorAndLineFormat})?(?: *})`,
    "(b)",
    "(i)",
    "(lt)",
    "(r)(?: *{ *)([^}]+)(?: *})"
  ];
  const styleRegExpStr = `(?:: *)(?:${styleRegExpList.join("|")})`;

  const regExpStr = `\\[\\[ *style((?: *${styleRegExpStr})*) *]]`;

  const borderStyleRegExp = new RegExp(lineStyleFormat, "gi");
  const styleRegExp = new RegExp(styleRegExpStr, "gi");
  const lineRegExp = new RegExp(regExpStr, "gi");

  return {
    borderStyleRegExp,
    styleRegExp,
    lineRegExp
  };
})();

export function escapeHtml(text: string): string {
  return text
    .replace(/\[\[quot]]/g, "&quot;")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}

export function transText(text: string): string {
  text = escapeHtml(text);

  const matchInfoList: any[] = [];
  let matchResult: RegExpExecArray | null;
  while ((matchResult = lineRegExp.exec(text)) !== null) {
    const styleStr = matchResult[1];
    const startIndex = matchResult.index;
    const contentsIndex = matchResult.index + matchResult[0].length;
    matchInfoList.push({
      styleStr,
      startIndex,
      contentsIndex
    });
  }

  if (!matchInfoList.length) return text;

  matchInfoList.push({ startIndex: text.length });
  const resultTexts: string[] = [];
  resultTexts.push(text.substring(0, matchInfoList[0].startIndex));

  for (let i = 0; i < matchInfoList.length - 1; i++) {
    const styleStr: string = matchInfoList[i]!.styleStr;
    const startIndex: number = matchInfoList[i]!.contentsIndex;
    const endIndex: number = matchInfoList[i + 1]!.startIndex;
    const contentsStr = text.substring(startIndex, endIndex);

    const style: string[] = [];
    const textDecoration: string[] = [];
    let rubyText: string = "";
    let matchResult = null;
    while ((matchResult = styleRegExp.exec(styleStr)) !== null) {
      if (matchResult[1] === "c") style.push(`color: ${matchResult[2]}`);
      if (matchResult[1] === "bc")
        style.push(`background-color: ${matchResult[2]}`);
      if (matchResult[3] === "u" || matchResult[3] === "o") {
        const lineObj: any = {
          type: matchResult[3] === "u" ? "underline" : "overline",
          style: "",
          color: ""
        };
        const setFunc: Function = (str: string): void => {
          if (str) {
            if (borderStyleRegExp.test(str)) lineObj.style = ` ${str}`;
            else lineObj.color = ` ${str}`;
          }
        };
        setFunc(matchResult[4]);
        setFunc(matchResult[5]);

        textDecoration.push(`${lineObj.type}${lineObj.style}${lineObj.color}`);
      }
      if (matchResult[6] === "b") style.push("font-weight: bold");
      if (matchResult[7] === "i") style.push("font-style: italic");
      if (matchResult[8] === "lt") textDecoration.push("line-through");
      if (matchResult[9] === "r") rubyText = matchResult[10];
    }
    if (textDecoration.length) {
      style.push(`text-decoration: ${textDecoration.join(" ")}`);
    }

    const styleText: string = style.join(";");
    const styleAttrStr: string = styleText ? ` style="${styleText};"` : "";
    let contentsText: string = contentsStr;
    if (rubyText) {
      contentsText = `<ruby><rb${styleAttrStr}>${contentsText}</rb><rp>（</rp><rt${styleAttrStr}>${rubyText}</rt><rp>）</rp></ruby>`;
    } else {
      if (styleText) {
        contentsText = `<span${styleAttrStr}>${contentsText}</span>`;
      }
    }
    resultTexts.push(contentsText);
  }
  return resultTexts.join("");
}

export type SendChatInfo = {
  chatType?: "chat" | "system-message";
  actorKey?: string | null;
  text: string;
  tabKey: string | null;
  statusKey: string | null;
  targetKey: string | null;
  system: string | null;
  isSecret: boolean;
  diceRollResult?: string;
  isSecretDice?: boolean;
  dices?: DiceResult[];
};

async function addChatLog(chatInfo: ChatStore): Promise<string> {
  const actorList = GameObjectManager.instance.actorList;
  const actor = findByKey(actorList, chatInfo.actorKey);
  const chatTabList = GameObjectManager.instance.chatTabList;
  const chatTab = findRequireByKey(chatTabList, chatInfo.tabKey);
  const groupChatTabList = GameObjectManager.instance.groupChatTabList;
  const target =
    chatInfo.targetType === "group"
      ? findRequireByKey(groupChatTabList, chatInfo.targetKey)
      : findByKey(actorList, chatInfo.actorKey);
  console.log(JSON.stringify(chatInfo, null, "  "));
  console.log({
    chatTabName: chatTab!.data!.name,
    actorName: actor ? actor.data!.name : "Quoridorn",
    targetName: target ? target.data!.name : "Quoridorn"
  });
  const keyList = await SocketFacade.instance.chatListCC().addDirect([
    {
      permission: {
        view: { type: "none", list: [] },
        edit: { type: "allow", list: [{ type: "owner" }] },
        chmod: { type: "none", list: [] }
      },
      data: chatInfo
    }
  ]);
  return keyList[0];
}

export async function sendSystemChatLog(text: string) {
  await sendChatLog(
    {
      chatType: "system-message",
      actorKey: null,
      text,
      tabKey: null,
      statusKey: null,
      targetKey: null,
      system: null,
      isSecret: false
    },
    []
  );
}

export async function sendChatLog(
  payload: SendChatInfo,
  subCustomDiceBotList: CustomDiceBotInfo[]
): Promise<BcdiceDiceRollResult | null> {
  const actorList = GameObjectManager.instance.actorList;
  const actorStatusList = GameObjectManager.instance.actorStatusList;
  const groupChatTabList = GameObjectManager.instance.groupChatTabList;

  const actorKey =
    payload.actorKey === undefined
      ? GameObjectManager.instance.chatPublicInfo.actorKey
      : payload.actorKey;
  const targetKey =
    payload.targetKey || groupChatTabList.find(gct => gct.data!.isSystem)!.key;

  const actor = findByKey(actorList, actorKey);
  const actorStatus = findByKey(
    actorStatusList,
    actor ? actor.data!.statusKey : null
  );
  const groupChatTabInfo = findByKey(groupChatTabList, targetKey);

  // tabKey
  let tabKey: string | null = payload.tabKey || null;
  if (!tabKey && groupChatTabInfo) {
    tabKey = groupChatTabInfo.data!.outputChatTabKey;
  }
  if (!tabKey) {
    tabKey = GameObjectManager.instance.chatPublicInfo.tabKey;
  }

  // statusKey
  let statusKey: string | null = payload.statusKey || null;
  if (!statusKey && actorStatus) {
    statusKey = actorStatus.key;
  }

  const chatInfo: ChatStore = {
    chatType: payload.chatType || "chat",
    tabKey: tabKey!,
    text: payload.text,
    diceRollResult: payload.diceRollResult || null,
    dices: payload.dices || [],
    isSecretDice: payload.isSecretDice || false,
    customDiceBotResult: null,
    actorKey,
    statusKey: statusKey!,
    system: payload.system || GameObjectManager.instance.chatPublicInfo.system,
    targetKey,
    targetType: groupChatTabInfo ? "group" : "actor",
    isSecret: payload.isSecret,
    like: []
  };

  const outputNormalChat = async (
    command: string
  ): Promise<BcdiceDiceRollResult | null> => {
    if (!/^[@><+-/*=0-9a-zA-Z()"?^$]+/.test(command)) {
      await addChatLog(chatInfo);
      return null;
    }
    const resultJson = await BcdiceManager.sendBcdiceServer({
      system: chatInfo.system,
      command
    });

    if (resultJson.ok) {
      // bcdiceとして結果が取れた
      chatInfo.diceRollResult = resultJson.result!;
      chatInfo.isSecretDice = resultJson.secret!;
      chatInfo.dices = resultJson.dices!;
    } else {
      // bcdiceとして結果は取れなかった
    }

    const oldText = chatInfo.text;
    if (chatInfo.isSecretDice) {
      chatInfo.chatType = "system-message";
      chatInfo.text = LanguageManager.instance.getText(
        "message.dice-roll-secret-dice"
      );
    }

    const chatKey = await addChatLog(chatInfo);

    if (chatInfo.isSecretDice) {
      const keepBcdiceDiceRollResultListCC = SocketFacade.instance.keepBcdiceDiceRollResultListCC();
      await keepBcdiceDiceRollResultListCC.addDirect([
        {
          data: {
            type: "secret-dice-roll",
            text: oldText,
            targetKey: chatKey!,
            bcdiceDiceRollResult: resultJson
          }
        }
      ]);
      if (!WindowManager.instance.getOpenedWindowInfo("secret-dice-roll")) {
        // 開いてなかったら開く
        // @ts-ignore
        await App.openSimpleWindow("secret-dice-roll-window");
      }
    }

    return resultJson.ok ? resultJson : null;
  };

  // -------------------
  // 独自ダイスBot処理
  // -------------------
  const commandStr = chatInfo.text
    // 空白で分割した1行目
    .split(new RegExp("\\s+"))[0]
    // 全角を半角へ
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s: string) =>
      String.fromCharCode(s.charCodeAt(0) - 65248)
    )
    .toLowerCase();
  const customDiceBotObj = BcdiceManager.instance.customDiceBotList.find(
    cdb => cdb.commandName.toLowerCase() === commandStr
  );
  const customDiceBotRoomSysObj = subCustomDiceBotList.find(
    cdb => cdb.commandName.toLowerCase() === commandStr
  );
  const useCustomDiceBotObj = customDiceBotObj || customDiceBotRoomSysObj;
  if (!useCustomDiceBotObj) {
    // 独自ダイスボットが見つからなかったので通常のチャット処理
    return await outputNormalChat(commandStr);
  } else {
    // 独自ダイスボットが見つかった
    const diceRoll = useCustomDiceBotObj.diceRoll;
    const tableTitle = useCustomDiceBotObj.tableTitle;
    const diceBotSystem = useCustomDiceBotObj.system;
    const tableContents = useCustomDiceBotObj.tableContents;

    const resultJson = await BcdiceManager.sendBcdiceServer({
      system: diceBotSystem,
      command: diceRoll
    });

    if (resultJson.ok) {
      // bcdiceとして結果が取れた
      chatInfo.diceRollResult = resultJson.result!;
      chatInfo.isSecretDice = resultJson.secret!;
      chatInfo.dices = resultJson.dices!;

      const diceRollResult = resultJson.result!.replace(/^.*→ */, "");
      const pips = chatInfo.dices.map(d => d.value);
      const diceResultStr = `(${sum(pips)}[${pips.join(",")}])`;

      const customDiceBotResult = tableContents[diceRollResult];

      chatInfo.customDiceBotResult = [
        tableTitle,
        diceResultStr,
        " → ",
        customDiceBotResult || "該当値なし"
      ].join("");

      // TODO メッセージに結果表示
      const viewMessage =
        customDiceBotResult || `該当値なし\n${diceRollResult}`;

      await addChatLog(chatInfo);

      return resultJson;
    } else {
      // bcdiceとして結果は取れなかった
      return null;
    }
  }
}

export function conversion(
  num: number,
  unitName: string
): { value: number; name: string; unit: string }[] | null {
  const convertTable: { name: string[]; base: string }[] = [
    {
      name: ["mm", "mm", "millimeter", "㍉", "㍉㍍", "ミリメートル"],
      base: "Length"
    },
    {
      name: ["cm", "cm", "centimeter", "㌢", "㌢㍍", "センチメートル"],
      base: "Length"
    },
    { name: ["m", "m", "meter", "㍍", "メートル"], base: "Length" },
    { name: ["km", "km", "kilometer", "㌔㍍", "キロメートル"], base: "Length" },
    { name: ["in", "in", "inch", "㌅", "インチ"], base: "Length" },
    { name: ["ft", "ft", "foot", "㌳", "フィート"], base: "Length" },
    { name: ["yd", "yd", "yard", "㍎", "ヤード"], base: "Length" },
    { name: ["mi", "mi", "mile", "マイル"], base: "Length" },
    { name: ["li", "li", "link", "リンク"], base: "Length" },
    { name: ["rd", "rd", "rod", "ロッド"], base: "Length" },
    { name: ["ch", "ch", "chain", "チェーン"], base: "Length" },
    { name: ["angstrom", "Å", "オングストローム"], base: "Length" },
    { name: ["mil", "mil", "ミル"], base: "Length" },
    // { name: ["寸"], base: "Length" },
    // { name: ["尺"], base: "Length" },
    // { name: ["里"], base: "Length" },
    {
      name: ["mm2", "mm²", "㎟", "平方㍉㍍", "平方ミリメートル"],
      base: "Surface area"
    },
    {
      name: ["cm2", "cm²", "㎠", "平方㌢㍍", "平方メートル"],
      base: "Surface area"
    },
    {
      name: ["m2", "m²", "㎡", "平方㍍", "平方メートル"],
      base: "Surface area"
    },
    {
      name: ["km2", "km²", "㎢", "平方㌔㍍", "平方キロメートル"],
      base: "Surface area"
    },
    {
      name: ["sqin", "in²", "sq in", "平方㌅", "平方インチ"],
      base: "Surface area"
    },
    {
      name: ["sqft", "ft²", "sq ft", "平方㌳", "平方フィート"],
      base: "Surface area"
    },
    {
      name: ["sqyd", "yd²", "sq yd", "平方㍎", "平方ヤード"],
      base: "Surface area"
    },
    { name: ["sqmi", "mi²", "sq mi", "平方マイル"], base: "Surface area" },
    { name: ["sqrd", "rd²", "sq rd", "平方ロッド"], base: "Surface area" },
    { name: ["sqch", "ch²", "sq ch", "平方チェイン"], base: "Surface area" },
    { name: ["sqmil", "mil²", "sq mil", "平方ミル"], base: "Surface area" },
    { name: ["acre", "ac", "エーカー"], base: "Surface area" },
    { name: ["hectare", "ha", "㌶", "ヘクタール"], base: "Surface area" },
    // { name: ["a", "アール"], base: "Surface area" },
    // { name: ["坪", "歩"], base: "Surface area" },
    // { name: ["畝"], base: "Surface area" },
    // { name: ["反"], base: "Surface area" },
    // { name: ["町"], base: "Surface area" },
    { name: ["mm3", "mm³", "平方㍉㍍", "立方ミリメートル"], base: "Volume" },
    {
      name: ["cm3", "cm³", "平方㌢㍍", "平方㌢", "立方センチメートル"],
      base: "Volume"
    },
    { name: ["m3", "m³", "㎥", "平方㍍", "立方メートル"], base: "Volume" },
    {
      name: ["km3", "km³", "平方㌖", "平方㌔㍍", "立方キロメートル"],
      base: "Volume"
    },
    {
      name: ["l", "L", "ℓ", "lt", "liter", "litre", "㍑", "リットル"],
      base: "Volume"
    },
    { name: ["cc", "cc", "㏄", "シーシー"], base: "Volume" },
    { name: ["cuin", "in³", "cu in", "平方㌅", "立方インチ"], base: "Volume" },
    {
      name: ["cuft", "ft³", "cu ft", "平方㌳", "立方フィート"],
      base: "Volume"
    },
    { name: ["cuyd", "yd³", "cu yd", "平方㍎", "立方ヤード"], base: "Volume" },
    { name: ["teaspoon", "tsp", "小さじ"], base: "Volume" },
    { name: ["tablespoon", "tbsp", "大さじ"], base: "Volume" },
    { name: ["minim", "min", "ミニム"], base: "Volume" },
    {
      name: ["fldr", "fldr", "fluiddram", "fl dr", "液量ドラム"],
      base: "Volume"
    },
    {
      name: ["floz", "floz", "fluidounce", "fl oz", "液量オンス"],
      base: "Volume"
    },
    { name: ["gi", "gi", "gill", "ジル"], base: "Volume" },
    { name: ["cp", "cp", "cup", "カップ"], base: "Volume" },
    { name: ["pt", "pt", "pint", "パイント"], base: "Volume" },
    { name: ["qt", "qt", "quart", "クォート"], base: "Volume" },
    { name: ["gal", "gal", "gallon", "ガロン"], base: "Volume" },
    {
      name: ["bbl", "bbl", "beerbarrel", "バレル", "米液量バレル"],
      base: "Volume"
    },
    { name: ["obl", "obl", "oilbarrel", "石油用バレル"], base: "Volume" },
    { name: ["hogshead", "hogshead", "ホッグスヘッド"], base: "Volume" },
    { name: ["gtt", "gtt", "drop", "ドロップ"], base: "Volume" },
    // { name: ["pk", "peck", "ペック"], base: "Volume" },
    // { name: ["升"], base: "Volume" },
    // { name: ["合"], base: "Volume" },
    // { name: ["斗"], base: "Volume" },
    // { name: ["石"], base: "Volume" },
    { name: ["mg", "mg", "milligram", "㍉㌘", "ミリグラム"], base: "Mass" },
    { name: ["g", "g", "gram", "㌘", "グラム"], base: "Mass" },
    {
      name: ["kg", "kg", "kilogram", "㌔㌘", "㌕", "キログラム"],
      base: "Mass"
    },
    { name: ["ton", "t", "tonne", "㌧", "トン"], base: "Mass" },
    { name: ["gr", "gr", "grain", "グレーン"], base: "Mass" },
    { name: ["dr", "dr", "dram", "ドラム"], base: "Mass" },
    { name: ["oz", "oz", "ounce", "オンス"], base: "Mass" },
    { name: ["lb", "lb", "lbm", "lbs", "poundmass", "ポンド"], base: "Mass" },
    {
      name: ["cwt", "cwt", "hundredweight", "ハンドレッドウェイト"],
      base: "Mass"
    }
  ];

  const getUnit: Function = (
    unitName: string
  ): { name: string[]; base: string } | null =>
    convertTable.find(unit => someByStr(unit.name, unitName)) || null;
  const filteredUnit = getUnit(unitName);
  if (!filteredUnit) return null;

  const base = filteredUnit.base;
  const name = filteredUnit.name[0];

  // console.log(num, unitName, base, name);

  return (
    convertTable
      .filter(unit => unit.base === base && unit.name[0] !== name)
      .map(targetUnit => targetUnit.name[0])
      .map((unit: string) => `${num}${name} to ${unit}`)
      // .map((unit: string) => {
      //   console.log(unit);
      //   return unit;
      // })
      .map((unit: string) => math.eval(unit).format())
      .map((result: string) => {
        // console.log(result);
        const mr: any = result.match(/([^ ]+) (.+)/);
        const floatValue: number = parseFloat(mr[1]);
        const unitStr: string = mr[2];
        const unit = getUnit(unitStr);
        return {
          value: floatValue,
          name: unit.name[unit.name.length - 1],
          unit: unit.name[1]
        };
      })
  );
}
