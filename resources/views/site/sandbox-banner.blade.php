@if(str_contains(request()->getHost(), 'sandbox'))
<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:#fff;font-size:14px;padding:8px 0;text-align:center;">
    ⚠️ Ambiente Sandbox — Os dados aqui são de teste e podem ser resetados a qualquer momento.
</div>
<div style="height:36px;"></div>
@endif
