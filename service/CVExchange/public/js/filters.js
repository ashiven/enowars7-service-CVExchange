//<script>

function filterEnding() {
    if(document.uploadForm.profilePicture.value.lastIndexOf(".jpg") == -1) {
        alert("Please upload only .jpg files!")
        return false
    }
}

function filterImage() {
    if (!(/\.(gif|jpg|jpeg|tiff|png)$/i).test(document.uploadForm.profilePicture.value)) {              
        alert('You must select an image file!')        
        return false   
    }
}

//</script>

// works for the following form:

/*
<form name="uploadForm">
<input type="file" name="profilePicture" onchange="filterEnding();"/>
</form>
*/