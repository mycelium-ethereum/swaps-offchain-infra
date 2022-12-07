export const getTransactionOnMyCelium = async () => {
	const url = 'https://api.mycelium.xyz/trs/actions?limit=1';
	const response = await fetch(url);
	const data = await response.json();
	return data;
};
