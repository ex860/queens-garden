# 皇后花園

8×8 邏輯遊戲，256 關，支援多解、輔助標記及勝利動畫。

純 HTML、CSS、JavaScript，無須建置。點擊順序為 X → 皇后 → 清空，拖曳可連續標記 X。

## GitHub Pages

將本資料夾中的檔案上傳到儲存庫根目錄，保留 `.nojekyll`。
到 Settings → Pages，選擇 Deploy from a branch、main、/(root)，儲存後等待部署完成。

遊戲進度存在瀏覽器的 localStorage。不同網站網址的儲存空間互相獨立，因此原 Sites 網址的進度不會自動轉移到 GitHub Pages。
