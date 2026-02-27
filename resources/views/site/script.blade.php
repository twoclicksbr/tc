<script>
    document.addEventListener("DOMContentLoaded", function() {
        const wrapper = document.querySelector(".swiper-wrapper");
        const slides = Array.from(wrapper.children);

        slides.sort(() => Math.random() - 0.5);

        slides.forEach(slide => wrapper.appendChild(slide));
    });
</script>

<script src="{{ asset('site/vendor/js/bundle.min.js') }}"></script>
<script src="{{ asset('site/vendor/js/TweenMax.min.js') }}"></script>
<script src="{{ asset('site/vendor/js/owl.carousel.min.js') }}"></script>
<script src="{{ asset('site/vendor/js/swiper.min.js') }}"></script>
<script src="{{ asset('site/vendor/js/jquery.fancybox.min.js') }}"></script>
<script src="{{ asset('site/assets/js/script.js') }}"></script>
