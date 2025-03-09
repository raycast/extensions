import { List } from "@raycast/api";
import React from "react";
import { useState } from "react";
import XiaoheService from "./XiaoheService";
import SvgService from "./SvgService";

// noinspection JSUnusedGlobalSymbols | Needed for Raycast extension
export default function Command() {
  const [pinyin, setPinyin] = useState("");
  const xiaohe = XiaoheService.convert(pinyin);
  const highlightKeys = XiaoheService.splitKeys(xiaohe);

  const svgService = new SvgService();
  svgService.updateKeyColor(highlightKeys);

  return (
    <List isShowingDetail searchBarPlaceholder="Type Pinyin to query Xiaohe key" onSearchTextChange={setPinyin}>
      <List.Item
        title={"Xiaohe key: "}
        subtitle={xiaohe}
        detail={<List.Item.Detail markdown={`![Xiaohe Keyboard](${svgService.getImgSrcData()})`} />}
      />
    </List>
  );
}
