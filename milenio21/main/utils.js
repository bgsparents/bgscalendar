var ENGLISH 		= 0;
var GERMAN 			= 1;
var SPANISH 		= 2;         
var EURO		 		= 3;         

var ITEM_CODE 			= 0;
var ITEM_TITLE 		= 1;
var ITEM_ARTNO			= 2;
var ITEM_PRICE_GBP	= 3;
var ITEM_PRICE_DEM	= 4;
var ITEM_PRICE_PTAS	= 5;
var ITEM_PRICE_EURO	= 6;
var ITEM_DESC_EN		= 7;
var ITEM_DESC_GR		= 8;
var ITEM_DESC_SP		= 9;

var CUST_FORENAME		= 0;
var CUST_SURNAME		= 1;
var CUST_ADDRESS		= 2;
var CUST_CITY			= 3;
var CUST_POSTCODE		= 4;
var CUST_COUNTRY		= 5;
var CUST_PHONE			= 6;
var CUST_FAX			= 7;
var CUST_EMAIL			= 8;

var currency_strings	= ["GBP", "DEM", "PTAS", "EURO"];

if(parent.language == null) {
	parent.language = ENGLISH;
}

if(parent.basket==null) {
	parent.basket = new Array();
}

var basket   = parent.basket;
var language = parent.language;
var currency = parent.currency;                       
var customer = parent.customer;


function setLanguage(lang) {
	parent.language = lang;     
	parent.currency = lang;
}                  

function setCurrency(cur) { 
	parent.currency = cur;
}         

function setCustomerDetails(forename, surname, address, city, country,	
	postalcode, phone, fax,	email) {
	
	parent.customer = [ forename, surname, address, city, postalcode, 
					 country, phone, fax, email];
}


function selectLanguage() {
	var area = document.all("textenglish");
	
	if ( area != null) {
		if(parent.language == ENGLISH) area.style.visibility = "visible";
		else area.style.visibility = "hidden";
	}
	
	area = document.all("textgerman");
	if ( area != null) {
		if(parent.language == GERMAN) area.style.visibility = "visible";
		else area.style.visibility = "hidden";
	}
	
	area = document.all("textspanish");
	if ( area != null) {
		if(parent.language == SPANISH) area.style.visibility = "visible";
		else area.style.visibility = "hidden";
	}
}

function buildsubmenu(md) {
	// Build header for submenu
	
	document.writeln('<DIV id=submenu>');
	document.writeln('<BR><IMG src="../images/bg_main.gif" width=70 height=2><BR>');
	
	// Iterate through the tuples in the menu list
	var treemenu = 0;
	var doingtreemenu = false;
	
	for(var i = 0; i < md.length; i+=4) {

		// If "***" then do separator
		if(md[i] == "***" ) {
			document.writeln('<BR><IMG src="../images/bg_main.gif" width=70 height=2><BR>');
		}
		else if(md[i+3] && md[i+3].charAt(0) == '>') {
   		document.writeln('<li id="foldheader">' + md[i + language] + '</li>');
   		document.writeln('<ul id="foldinglist" style="display:none" style=&{head};>');
			//document.writeln('&nbsp;<label id=tree' + treemenu + ' onclick="expandMenu(this)" style="position:relative">' + md[i + language] + '<BR>');
			//document.writeln('<span id=tree' + treemenu + 'items style="visibility:hidden">');
			treemenu++;
			doingtreemenu = true;
		}
		
		else if(md[i].charAt(0) == '<') {
			document.writeln('</ul>');
			//document.writeln('</span>');
			doingtreemenu = false;
		}
		
		// Else if no link do header
		else if(!md[i+3]) {
			document.writeln('<EM>' + md[i + language] + '</EM><BR>');
		}
		
		// Else do menu item
		else if (doingtreemenu) {
			document.writeln('<li><A href=' + md[i+3] + ' target=MAIN>' + md[i + language] + '</A></li>');
			//document.writeln('&nbsp&nbsp;<A href=' + md[i+3] + ' target=MAIN>' + md[i + language] + '</A><BR>');
		}
		else {
			document.writeln('&nbsp;<A href=' + md[i+3] + ' target=MAIN>' + md[i + language] + '</A><BR>');
		}
	}
	document.writeln('</DIV>');
}   

function change(){
   if(!document.all)
      return
   if (event.srcElement.id=="foldheader") {
      if(selectedlist != null) {
      	selectedlist.style.display="none";
      }
      
      var srcIndex = event.srcElement.sourceIndex
      var nested = document.all[srcIndex+1]
      if (nested.style.display=="none") {
         nested.style.display=''
         selectedlist = nested;
      }
      else {
         nested.style.display="none"
         selectedlist = null;
      }
      
   }
}

selectedlist = null;
document.onclick=change


function expandMenu(tree) { 
	var item = document.all(tree.id + 'items');
	item.style.visibility = "visible";
} 

function buildmusicpage(code, title, artno, priceptas, priceeuro, pricedem, pricegbp, descen, descgr, descsp) {
	//<IMG SRC="../images/button_order.gif" onClick="addToBasket(\'' + title + '\',\'' + artno + '\',\'' + priceptas + ' PTAS (' + priceeuro + ' EURO)\', document.forms[0].elements[0].value)"> \
	//alert('var item = [\'' + code + '\',\'' + title + '\',\'' + artno + '\',\'' + priceeuro + '\',\'' + pricedem + '\',\'' + pricegbp + '\',\'' + descen + '\',\'' + descgr + '\',\'' + descsp + '\']'); 
	
	var str_items 	= ["Number of items to order:", "Anzahl zu bestellende Artikel:", "Cantidad del articulo a pedir:"];
	var str_demo  	= ["Check out the sound", "Check mal diesen Sound", "Prueba nuestro sonido"];
	var str_price 	= ["Price:", "Preis:", "Precio:"];
	var desc 		= [descen, descgr, descsp];
   var gifadd  = [".gif", "_de.gif", "_sp.gif"];
	
	

	document.writeln('\
		<HTML><HEAD> \
		<LINK rel="stylesheet" type="text/css" href="../main/style.css"> \
		</HEAD> \
		<SCRIPT LANGUAGE=javascript> \
			function getItem() { \
				return [\'' + code + '\',\'' + title + '\',\'' + artno + '\',\'' + pricegbp + '\',\'' + pricedem + '\',\'' + priceptas + '\',\'' + priceeuro + '\',\'' + descen + '\',\'' + descgr + '\',\'' + descsp + '\']; \
			} \
		</SCRIPT> \
		\
		<BODY id=textarea> \
			<IMG id=cdcover src="' + code + '.jpg" > \
			\
			<DIV id=cdorder><FORM> \
				' + str_items[language] + '<input TYPE="TEXT" NAME="Number" VALUE="1" SIZE="2">&nbsp;&nbsp;<BR> \
				<IMG SRC="../images/button_order' + gifadd[language] + '" onClick="addToBasket( getItem(), document.forms[0].elements[0].value)"> \
			</FORM></DIV> \
			\
			<TABLE id=prices border=0 cellPadding=2 cellSpacing=0 style="WIDTH: 1%" width=1%> \
				<TR><TD><STRONG>Art.Nr:</STRONG></TD><TD> ' + artno + '</TD></TR> \
				<TR><TD vAlign=top><STRONG>' + str_price[language] + '</STRONG></TD> \
					<TD noWrap>' + priceptas + ' PTAS, ' + priceeuro + ' EURO, ' + pricedem + ' DEM, ' + pricegbp + ' GBP</TD> \
				</TR> \
				<TR><TD><A href=' + code + '.mp3"><IMG border=0 SRC="../images/mp3.gif"></A></TD><TD><A href=' + code + '.mp3">' + str_demo[language] + '</A></TD></TR> \
			</TABLE> \
			\
			<DIV id=cddescription> \
    			<H1>' + title + '</H1> \
    			<P>' + desc[language] + '<\P> \
			</DIV> \
			\
		</BODY> \
		</HTML>');
}


function buildShoppingCart() {
	var headings = [ 	["Quantity","Title","Art. No.","Price(" + currency_strings[currency] + ")","Total(" + currency_strings[currency] + ")","Action"],
				["Anzahl","Titel","Art. Nr.","Preis(" + currency_strings[currency] + ")","Gesamt(" + currency_strings[currency] + ")","Aktion"],
				["Cantidad","Titulo","Nr. Art.","Precio(" + currency_strings[currency] + ")","Total(" + currency_strings[currency] + ")","Acción"] ];
	var str_title  	= ["Shopping Cart", "Warenkorb", "Carrito Compra"]; 
	var str_currency 	= ["Currency", "Währung", "Moneda"];
	
	var basket = parent.basket;  
	
	var buffer = '';
	
	buffer += '<H1>' + str_title[language] + '</H1>';
	buffer += '<FORM name="busqueda" method="get" action="http://www.milenio21.com/cgi-bin/totalizacion.exe">';
   buffer += '<input type="hidden" name="nombre_comercio" value="MILENIO21">';
   buffer += '<input type="hidden" name="referencia" value>';
   buffer += '<input type="hidden" name="coste" value>';
   	buffer += '<P align=center>';
	
	// The table headings
	buffer += '<TABLE WIDTH=100% BORDER=0 CELLSPACING=0 CELLPADDING=0 style="FONT-SIZE: 12px">';
	buffer += '<TR style="BACKGROUND-COLOR: white; COLOR: black; FONT-WEIGHT: bold;">';
	for(var i = 0; i < headings[language].length; ++i) buffer += '<TD align="center">&nbsp;' + headings[language][i] + '&nbsp;</TD>';
	buffer += '</TR>';
	
	// The items in the basket   
	var total = 0; 
	var ptas_total = 0;
	for(var i = 0; i < basket.length; ++i) {
		var basketitem = basket[i];
	   var it = basketitem[0];
	   var n  = basketitem[1];
	   var price = it[ITEM_PRICE_GBP + currency];
	   var subtotal = roundPrice(n * price, currency);
	   ptas_total += parseFloat( roundPrice(n * it[ITEM_PRICE_PTAS], SPANISH) );
	   total += parseFloat(subtotal);
	   
		buffer += '<TR>';
		buffer += '<TD>' + n + '</TD>';
		buffer += '<TD>&nbsp;' + it[ITEM_TITLE] + '&nbsp;</TD>';
		buffer += '<TD>&nbsp;' + it[ITEM_ARTNO] + '&nbsp;</TD>';
		buffer += '<TD align="right">' + price + '&nbsp;</TD>';
		buffer += '<TD align="right">' + subtotal + '&nbsp;</TD>';
		buffer += '<TD align="right"><A href=' + document.URL + '>';
		buffer += '<IMG border=0 SRC="../images/button_remove.gif" onClick="removeFromBasket(' + i + ')">';
		buffer += '</A></TD>';
		buffer += '</TR>';
	}
	
	buffer += '</TABLE>';
	buffer += '</P>'; 
	
   // Just copied this from the old site
   buffer += '<SCRIPT LANGUAGE=JAVASCRIPT>';
	buffer += "document.busqueda.target='ccwindow';";
   buffer += 'referencia = calcular_referencia();';
	buffer += 'document.busqueda.referencia.value = referencia;';
	buffer += 'document.busqueda.coste.value = ' + ptas_total ;
   buffer += '</SCRIPT>';
	                                  

	buffer += '<TABLE width="100%" border=0 cellspacing=0 cellpadding=0 id=cartfooter><TR>';
	
	// Currency selector
	buffer += '<TD align=left noWrap id=cartfootercell>';
	buffer += '<FONT color=black face="" style="BACKGROUND-COLOR: white; FONT-WEIGHT: bold">' + str_currency[language] + ':</FONT>';
	buffer += '<IMG align="absmiddle" SRC="../images/bg_main.gif" height=25 width=0>'; 
	buffer += '<A href=' + document.URL + '>';
	buffer += '<IMG border=0 SRC="../images/smallflag_spanish.gif" onClick="setCurrency(SPANISH)">'; 
	buffer += '<IMG border=0 SRC="../images/smallflag_gb.gif" onClick="setCurrency(ENGLISH)">'; 
	buffer += '<IMG border=0 SRC="../images/smallflag_german.gif" onClick="setCurrency(GERMAN)">'; 
	buffer += '<IMG border=0 SRC="../images/smallflag_euro.gif" onClick="setCurrency(EURO)">'; 
	buffer += '</A>';
	buffer += '</TD>';
	
	buffer += '<TD width="100%"></TD>';
	buffer += '</TD>';
	
	// The total and purchase button
	if(basket.length > 0 ) {
		buffer += '<TD align=right noWrap id=cartfootercell>';
		buffer += '<FONT color=black face="" style="BACKGROUND-COLOR: white; FONT-WEIGHT: bold">Total:</FONT> ';
		buffer += roundPrice(total, currency) + ' ' + currency_strings[currency]; 
		buffer += '<A href="customerform.htm"><IMG BORDER=0 SRC="../images/button_purchase.gif" align="absmiddle"></A>'; 
		buffer += '</TD>';
	}
		
	buffer += '</TR></TABLE>';
	buffer += '';
	
	buffer += '</FORM>';     
	
	document.writeln(buffer);    
	
	//var w = self.top.opener;
	//alert(w.location.href);
   //w.document.location.replace("http://www.9ls.com");

}		

function roundPrice(number, cur) {
	if(cur == SPANISH) {
		return Math.round(number);
	}
	else {		
		var str = new String(Math.round(number * 100) / 100);
   	if(str.indexOf('.') < 0) str += '.00';
   	else if(str.length - str.indexOf('.') < 3) str += '0';
   	return str;	
   }
}                 

function getTotal(cur) {
	var total = 0; 
	
	for(var i = 0; i < basket.length; ++i) {
		var basketitem = basket[i];
	   var it = basketitem[0];
	   var n  = basketitem[1];
	   total += parseFloat( roundPrice(n * it[ITEM_PRICE_GBP + cur], cur) );
	}
	return total;
}

function getTotalString(cur) {
	return roundPrice(getTotal(cur), cur) + ' ' + currency_strings[cur];
}

function addToBasket(item, number) {
	var basket 	= parent.basket;
   var price	= item[ITEM_PRICE_GBP + language];
   var index 	= basket.length;
   var num	   = number;

	
	str_alert = ['\nThe amount ordered is not correct!',
			'\nDie Anzahl der Artikel ist falsch!',
			'\nLa cantidad de articulos pedido no es correcto'];
	
	if(number <= 0 || number > 10)  {
	   alert(str_alert[language]);
	} 
	else {

		str_placeorder = ['Would you like to put '+ number +' x '+ item[ITEM_TITLE] +' in your shopping trolley?',
				'Möchtest Du '+ number +' x '+ item[ITEM_TITLE] +' in Deinem Warenkorb legen?',
				'Quieres meter '+ number +' x '+ item[ITEM_TITLE] +' en tu carrito de compra?'];

		if (confirm(str_placeorder[language])) {
	   	
	   	// See if an entry for this item already exists.
	   	for(var i = 0; i < basket.length; ++i ) {
	   		if(basket[i][0][ITEM_ARTNO] == item[ITEM_ARTNO]) {
	   			index = i;
	   			num 	= parseInt(basket[i][1]) + parseInt(number);
	   			break;
	   		}	
	   	}
	   	
	   	basket[index] = [item, num];
	   }
	}
	
	basket.sort( function(a, b) { 
			if(a[0][ITEM_TITLE] < b[0][ITEM_TITLE]) return -1;
			else return 1;
	});
}  

function removeFromBasket(index) {
	str_confirm = ["Are you sure you want to remove this item from your shopping cart?",
						"Bist Du sicher das Du diesen Artikel von Warenkorb entfernen willst?",
						"Estas seguro que quieres eliminar este articulo?"];
	if(confirm(str_confirm[language])) {						
		var oldbasket = parent.basket;
		var newbasket = oldbasket.slice(0, index);  
		parent.basket = newbasket.concat(oldbasket.slice(index + 1, oldbasket.length));
	}
}     

function calcular_referencia(){
	currentTime = new Date();
	reloj = currentTime.getYear();
	
	mes = currentTime.getMonth();
	mes = mes + 1;
	if (mes < 10) mes = '0' + mes;
	reloj = reloj + "" + mes;
					 
	dia = currentTime.getDate();
	if (dia < 10) dia = '0' + dia;
	reloj = reloj + "" + dia;

	horas = currentTime.getHours();					 
	if (horas < 10) horas = '0' + horas;
	reloj = reloj + "" + horas;

	minutos = currentTime.getMinutes();
	if (minutos < 10)	minutos = '0' + minutos;
	
	reloj = reloj + "" + minutos;

	segundos = currentTime.getSeconds();
	if (segundos < 10) segundos = '0' + segundos;
	reloj = reloj + "" + segundos;
   
   return reloj;               
}
