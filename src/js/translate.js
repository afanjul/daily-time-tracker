/* Code to translate html components automatically */
$(function () {
    let items = $("[data-i18n]");
    let l = items.length;
    for (let i = 0; i < l; i++) {
        let translation = chrome.i18n.getMessage(items.eq(i).attr("data-i18n"));
        if (items.eq(i).val() === "i18n") {
            items.eq(i).val(translation);
        } else {
            items.eq(i).text(translation);
        }
        if (items.eq(i).prop('placeholder') !== '') {
            items.eq(i).prop('placeholder', translation);
        }
    }
});