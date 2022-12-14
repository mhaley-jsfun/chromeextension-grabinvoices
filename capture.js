var capture = chrome.extension.connect({
  name: "capture.js <-> background.js"
});
console.log("captureJS===============================",chromeextension_vendor);

async function waitUntilAmazonInvoiceDomAppear(resolve) {
  var iBodyTable = null;
  if(document.querySelector('#amazon_order_specialinvoice'))
    iBodyTable = document.querySelector('#amazon_order_specialinvoice').contentWindow.document.querySelector("body table");

  if(iBodyTable) return resolve("done!");
  else {
    await new Promise(resolve => setTimeout(resolve, 200));
    waitUntilAmazonInvoiceDomAppear(resolve);
  }
}

let waitDom = new Promise((resolve, reject) => {
  waitUntilAmazonInvoiceDomAppear(resolve);
});

async function amazonCapture_pdfcapture(link, callback) {
  var iframe = document.createElement('iframe');

  iframe.src = "https://www.amazon.com/" + link;
  iframe.id="amazon_order_specialinvoice";

  document.body.appendChild(iframe);

  await waitDom;

  var iBody = document.querySelector('#amazon_order_specialinvoice').contentWindow.document.querySelector("body");
  if (iBody) {
    iBody.style.width = "780px";
    iBody.style.transform = iBody.style.webkitTransform = `scale(${window.innerWidth / window.outerWidth})`;
    iBody.style.transformOrigin = iBody.style.webkitTransformOrigin = '0 0';
    await new Promise(resolve => setTimeout(resolve, 100));
    html2canvas(iBody).then((canvas) => { // 
      // var imgData = canvas.toDataURL('image/png');              
      // var doc = new jsPDF();
      // doc.addImage(imgData, 'PNG', 0, 0);
      // doc.save("amazon__ATVPDKIKX0DER__.pdf");
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();

      const imgProps= pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG',0,0, pdfWidth, pdfHeight);
      pdf.save('download.pdf');

      var blobPDF = new Blob([pdf.output('blob')], {type: 'application/pdf'});
      return callback({name: "amazon__ATVPDKIKX0DER__.pdf", blob: blobPDF});

      // canvas.toBlob(function(blob){
      //   return callback({name: "amazon__ATVPDKIKX0DER__.png",blob: blob});
      // },'image/png');
    })
  } else {
    return callback(null);
  }
}

function amazonGetInvoiceList(callback) {
  var invoicesLink = document.querySelectorAll("div.a-box.order-info div.actions.a-col-right div.a-row.yohtmlc-order-level-connections a[class='a-link-normal']");
  var linkArr = [];
  for(var i = 0; i < invoicesLink.length; i++) {
    var href = invoicesLink[i].getAttribute("href");
    if(href) {
      linkArr.push(invoicesLink[i].getAttribute("href"))
    }
  }
  callback(linkArr);
}

async function ebayCapture(callback) {
  // document.body.style.zoom = (window.innerWidth / window.outerWidth);
  // await new Promise(resolve => setTimeout(resolve, 200));
  // var ordersDom = document.querySelector("div.m-container-items");
  // if(!ordersDom) callback({});
  
  // var fileName = document.querySelector("a.m-top-nav__username").getAttribute("href").slice(25) + ".pdf"; // https://www.ebay.com/usr/evyatarshoresh
  // ordersDom.style.width = "800px";
  document.querySelector("div.page-header-action-box button.printer-friendly-button.btn--secondary").click();
  var fileName = "ebay_invoice.pdf";
  await new Promise(resolve => setTimeout(resolve, 200));
  var ordersDom = document.querySelector("div.ReactModalPortal div.modal-content");
  ordersDom.style.width = "780px";
  ordersDom.style.transform = ordersDom.style.webkitTransform = `scale(${window.innerWidth / window.outerWidth})`;
  ordersDom.style.transformOrigin = ordersDom.style.webkitTransformOrigin = '0 0';

  html2canvas(ordersDom,{useCORS: true}).then((canvas) => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();

    const imgProps= pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG',0,0, pdfWidth, pdfHeight);
    pdf.save(fileName);
    var blobPDF = new Blob([pdf.output('blob')], {type: 'application/pdf'});
    return callback({name: fileName, blob: blobPDF});
  });

}

switch (chromeextension_vendor) {
  case 'amazon_orders':
    amazonGetInvoiceList(function(linkArr) {
      console.log('linkArr: ', linkArr);
      amazonCapture_pdfcapture(linkArr[0], function(obj){
        var URL = window.URL || window.webkitURL;
        var urlLink = URL.createObjectURL(obj.blob);
        capture.postMessage({txt: "@Capture_capturedImage", file:{name: obj.name, blobLink: urlLink} });
        window.close();
      })
    });
  break;
  case 'ebay_orders':
    ebayCapture(function(obj){
      var URL = window.URL || window.webkitURL;
      var urlLink = URL.createObjectURL(obj.blob);
      capture.postMessage({txt: "@Capture_capturedImage_ebay", file:{name: obj.name, blobLink: urlLink} });
      window.close();
    })
  break;
}