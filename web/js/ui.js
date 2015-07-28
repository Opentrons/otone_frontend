/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var currentTab = 'deck';

function changeTab(tabName) {
	if(tabName!=currentTab) {
		try {
			document.getElementById(currentTab+'Link').classList.remove('active');
			document.getElementById(currentTab+'_container').style.display = 'none';
		}
		catch(e){
			console.log(e);
		}

		currentTab = tabName;

		try {
			document.getElementById(currentTab+'Link').classList.add('active');
			document.getElementById(currentTab+'_container').style.display = 'block';
		}
		catch(e){
			console.log(e);
		}
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var debug_showing = false;

function toggleDebug(source){
	debug_showing = !debug_showing;

	if(debug_showing) {
		document.getElementById('debug_container').style.display = 'block';
		source.innerHTML = '[X] Close';
	}
	else {
		document.getElementById('debug_container').style.display = 'none';
		source.innerHTML = 'Debug Monitor';
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

window.addEventListener('load',function(){
	var parent_ab = document.getElementById('stepSize_ab');
	parent_ab.selectedStep = parent_ab.children[0];
	parent_ab.value = parent_ab.selectedStep.value;
	parent_ab.selectedStep.classList.add('active');

	var parent_xyz = document.getElementById('stepSize_xyz');
	parent_xyz.selectedStep = parent_xyz.children[1];
	parent_xyz.value = parent_xyz.selectedStep.value;
	parent_xyz.selectedStep.classList.add('active');


	toggleJog('b');
});

function changeStepSize(source, axisLabel, value) {

	var buttonParent = document.getElementById('stepSize_'+axisLabel);

	buttonParent.value = value;

	if(buttonParent.selectedStep) {
		buttonParent.selectedStep.classList.remove('active');
	}

	buttonParent.selectedStep = source;

	buttonParent.selectedStep.classList.add('active');

}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function toggleJog(jogGroup){
	var parentJog = document.getElementById("jogAB");
	var a = document.getElementById("jogA");
	var b = document.getElementById("jogB");

	var aBtns = document.getElementsByClassName("a");
	var bBtns = document.getElementsByClassName("b");

	if (jogGroup =='a'){	
		if(!a.classList.contains("tron-blue")){	
		a.classList.add('tron-blue');
		}
		if(b.classList.contains("tron-black")){	
		b.classList.remove('tron-black');
		}
		for(var i=0; i<aBtns.length; i++){
			aBtns[i].disabled=false;
			bBtns[i].disabled=true;
		}		
	}
	if (jogGroup =='b'){
		if(a.classList.contains("tron-blue")){	
		a.classList.remove('tron-blue');
		}
		if(!b.classList.contains("tron-black")){	
		b.classList.add('tron-black');
		}	
		for(var i=0; i<bBtns.length; i++){
			bBtns[i].disabled=false;
			aBtns[i].disabled=true;
		}			
	}
	
	

	


}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////


window.addEventListener ('load', function () {
	changeStepSize(document.getElementById('defaultXYZStepSizeBtn'),'xyz',20);
	changeStepSize(document.getElementById('defaultABStepSizeBtn'),'ab',2);
});

//document.getElementById('defaultXYZStepSizeBtn').click();
//document.getElementById('defaultABStepSizeBtn').click();