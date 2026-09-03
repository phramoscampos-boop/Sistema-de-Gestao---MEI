const bt_profile = document.getElementById('bt_profile');



function mostrarPerfil() {
    const bt_profile = document.getElementById('bt_profile')
    const profile_info = document.getElementById('profile_info')
    
    bt_profile.onclick = function() {
        
        profile_info.style.display = 'flex';
    };
}
mostrarPerfil();