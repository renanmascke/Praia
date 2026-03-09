<?php
// Permite que qualquer origem acesse este arquivo (ou restrinja para o seu próprio domínio se preferir)
header('Access-Control-Allow-Origin: *');
header('Content-Type: text/html; charset=UTF-8');

$targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/relatorioBalneabildade';

// Inicia o cURL
$ch = curl_init();

// Configura as opções do cURL
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Ignora verificação de certificado SSL se o portal do governo falhar nisso
curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Permite até 15 segundos pro governo responder
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'); // Finge ser um navegador real

// Executa a requisição
$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Verifica se houve erro
if(curl_errno($ch)){
    http_response_code(500);
    echo 'Erro no proxy interno cURL: ' . curl_error($ch);
} else if ($httpCode != 200) {
    http_response_code($httpCode);
    echo 'Erro: O portal do IMA retornou HTTP ' . $httpCode;
} else {
    // Retorna o HTML capturado
    echo $html;
}

// Fecha o cURL
curl_close($ch);
?>
